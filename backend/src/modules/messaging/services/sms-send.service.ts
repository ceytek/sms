import { Injectable, Logger } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { SmsCampaign } from '../entities/sms-campaign.entity.js';
import { SmsCampaignBatch } from '../entities/sms-campaign-batch.entity.js';
import { SmsCampaignRecipient } from '../entities/sms-campaign-recipient.entity.js';
import { CompanySmsAccount } from '../../companies/entities/company-sms-account.entity.js';
import { CompanyOriginator } from '../../companies/entities/company-originator.entity.js';
import { SmsProvider } from '../../reference/entities/sms-provider.entity.js';
import { SmsBatchStatus } from '../../../common/enums/sms-batch-status.enum.js';
import { SmsCampaignStatus } from '../../../common/enums/sms-campaign-status.enum.js';
import { SmsRecipientStatus } from '../../../common/enums/sms-recipient-status.enum.js';
import { OriginatorStatus } from '../../../common/enums/originator-status.enum.js';
import { ProviderRateLimiter } from '../queue/provider-rate-limiter.js';
import { isSmsProviderLiveMode, SmsProviderRegistry } from '../adapters/sms-provider.registry.js';
import { SmsAccountResolverService } from './sms-account-resolver.service.js';
import {
  RetryableProviderError,
  PermanentProviderError,
  type ProviderCallConfig,
} from '../adapters/sms-provider.adapter.js';
import { toSmsContentEncoding } from '../adapters/provider-ids.js';
import { KOCAELI_API_PATHS } from '../adapters/kocaeli-paths.js';
import { sanitizeProviderError } from '../adapters/provider-http.client.js';
import { CampaignStateService } from './campaign-state.service.js';
import { SmsBalanceService } from './sms-balance.service.js';
import { CredentialsService } from '../../credentials/credentials.service.js';
import { CredentialType } from '../../../common/enums/credential-type.enum.js';

export type SmsSendBatchJob = {
  data: { campaignId: string; companyId: string; batchId: string };
  id?: string | number;
  token?: string;
  attemptsMade?: number;
  opts?: { attempts?: number };
  moveToDelayed?: (timestamp: number, token?: string) => Promise<unknown>;
};

type ProviderApiSchema = {
  api?: {
    baseUrl?: string;
    timeoutMs?: number;
    sendPath?: string;
    summaryPath?: string;
    creditPath?: string;
    creditMethod?: 'GET' | 'POST';
    sendersPath?: string;
    gatewaysPath?: string;
    reportPath?: string;
    detailReportPath?: string;
    gateway?: string;
  };
};

@Injectable()
export class SmsSendService {
  private readonly logger = new Logger(SmsSendService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly limiter: ProviderRateLimiter,
    private readonly registry: SmsProviderRegistry,
    private readonly state: CampaignStateService,
    private readonly credentials: CredentialsService,
    private readonly balance: SmsBalanceService,
    private readonly smsAccounts: SmsAccountResolverService,
  ) {}

  async dispatchBatch(data: { campaignId: string; companyId: string; batchId: string }) {
    await this.sendBatch({
      data,
      id: `inline-${data.batchId}`,
      attemptsMade: 0,
      opts: { attempts: 1 },
    });
  }

  async sendBatch(job: SmsSendBatchJob) {
    const batch = await this.dataSource.getRepository(SmsCampaignBatch).findOne({
      where: { id: job.data.batchId },
    });
    if (!batch) return;
    const campaign = await this.dataSource.getRepository(SmsCampaign).findOne({
      where: { id: job.data.campaignId },
    });
    if (!campaign || campaign.status === SmsCampaignStatus.CANCELLED) {
      batch.status = SmsBatchStatus.CANCELLED;
      await this.dataSource.getRepository(SmsCampaignBatch).save(batch);
      return;
    }

    try {
      const account = await this.smsAccounts.resolve(campaign.senderCompanyId);
      if (account) {
        campaign.smsAccountId = account.id;
        campaign.providerId = account.providerId;
        await this.dataSource.getRepository(SmsCampaign).update(
          { id: campaign.id },
          { smsAccountId: account.id, providerId: account.providerId },
        );
      } else if (isSmsProviderLiveMode()) {
        throw new PermanentProviderError(
          'Üst bayi SMS hesabı yok. Admin → SMS Sağlayıcılar içine VoiceTelekom kullanıcı adı ve şifresini kaydedin.',
        );
      }
      if (isSmsProviderLiveMode() && !campaign.isMock && !campaign.reservationTxId) {
        throw new PermanentProviderError('SMS kredisi rezervasyonu yok, gonderim durduruldu');
      }

      const provider = campaign.providerId
        ? await this.dataSource.getRepository(SmsProvider).findOne({ where: { id: campaign.providerId } })
        : null;
      const limits = this.limiter.normalize(provider?.rateLimits);
      const acquire = await this.limiter.acquire(
        campaign.providerId ?? 'mock',
        campaign.smsAccountId ?? campaign.senderCompanyId,
        limits,
        batch.recipientCount || 1,
      );
      if (!acquire.ok) {
        if (job.moveToDelayed) {
          await job.moveToDelayed(Date.now() + acquire.retryAfterMs, job.token);
          return;
        }
        await sleep(Math.min(acquire.retryAfterMs, 2_000));
        const again = await this.limiter.acquire(
          campaign.providerId ?? 'mock',
          campaign.smsAccountId ?? campaign.senderCompanyId,
          limits,
          batch.recipientCount || 1,
        );
        if (!again.ok) {
          throw new RetryableProviderError('Provider rate limit');
        }
      }

      const adapter = this.registry.resolve(provider?.code, { forceMock: campaign.isMock });
      const originator = await this.requireSendableOriginator(campaign, account);
      const credentials = await this.loadCredentials(account);
      const callConfig = toCallConfig(provider?.configSchema, campaign, batch, originator.name);

      const recipients = await this.dataSource.getRepository(SmsCampaignRecipient).find({
        where: { batchId: batch.id },
      });
      const toSend: SmsCampaignRecipient[] = [];
      for (const row of recipients) {
        if (
          row.status === SmsRecipientStatus.ACCEPTED ||
          row.status === SmsRecipientStatus.SENT ||
          row.status === SmsRecipientStatus.DELIVERED
        ) {
          continue;
        }
        if (row.clientReference && row.status === SmsRecipientStatus.PROCESSING) {
          const existing = await adapter.queryByReference(row.clientReference, {
            credentials,
            config: callConfig,
          });
          if (existing?.status === 'ACCEPTED' || existing?.status === 'SENT' || existing?.status === 'DELIVERED') {
            await this.state.applyDelivery(row.clientReference, SmsRecipientStatus.ACCEPTED, {
              providerMessageId: existing.providerMessageId,
              providerState: existing.providerState,
            });
            continue;
          }
        }
        if (row.status === SmsRecipientStatus.INCLUDED || row.status === SmsRecipientStatus.QUEUED) {
          row.clientReference = row.clientReference ?? `sms.${campaign.id}.${row.id}`;
          const claimed = await this.state.transitionRecipient(
            row.id,
            [SmsRecipientStatus.INCLUDED, SmsRecipientStatus.QUEUED],
            SmsRecipientStatus.PROCESSING,
            {
              clientReference: row.clientReference,
              claimedAt: new Date(),
              batchId: batch.id,
              sendAttempt: (row.sendAttempt || 0) + 1,
            },
          );
          if (!claimed) continue;
          toSend.push({ ...row, clientReference: row.clientReference });
        } else if (row.status === SmsRecipientStatus.PROCESSING && row.clientReference) {
          toSend.push(row);
        }
      }

      if (!toSend.length) {
        batch.status = SmsBatchStatus.ACCEPTED;
        batch.completedAt = new Date();
        await this.dataSource.getRepository(SmsCampaignBatch).save(batch);
        await this.state.reconcileCampaign(campaign.id);
        await this.balance.maybeRefundIfTerminal(campaign.id);
        return;
      }

      batch.status = SmsBatchStatus.PROCESSING;
      batch.attempt += 1;
      batch.claimedAt = new Date();
      batch.jobId = String(job.id ?? '');
      await this.dataSource.getRepository(SmsCampaignBatch).save(batch);

      const result = await adapter.sendBatch({
        originator: originator.name,
        credentials,
        config: callConfig,
        items: toSend.map((row) => ({
          to: row.mobileNormalized as string,
          body: row.renderedBody || campaign.body,
          clientReference: row.clientReference as string,
          originator: originator.name,
          recipientId: row.id,
        })),
      });

      if (result.providerBatchId) {
        batch.providerPackageId = result.providerBatchId;
      }

      for (const item of result.items) {
        if (item.accepted) {
          await this.state.applyDelivery(item.clientReference, SmsRecipientStatus.ACCEPTED, {
            providerMessageId: item.providerMessageId || result.providerBatchId,
          });
          if (result.mock) {
            await this.state.applyDelivery(item.clientReference, SmsRecipientStatus.SENT, {
              providerMessageId: item.providerMessageId,
            });
            await this.state.applyDelivery(item.clientReference, SmsRecipientStatus.DELIVERED, {
              providerMessageId: item.providerMessageId,
            });
          }
        } else if (item.retryable) {
          throw new RetryableProviderError(item.error || 'Provider gecici hata', item.rawCode);
        } else {
          await this.state.applyDelivery(item.clientReference, SmsRecipientStatus.REJECTED, {
            error: item.error,
          });
        }
      }
      batch.status = SmsBatchStatus.ACCEPTED;
      batch.completedAt = new Date();
      batch.lastError = undefined;
      await this.dataSource.getRepository(SmsCampaignBatch).save(batch);
      await this.state.markCampaign(
        campaign.id,
        [SmsCampaignStatus.READY, SmsCampaignStatus.QUEUED, SmsCampaignStatus.PROCESSING, SmsCampaignStatus.SENDING],
        SmsCampaignStatus.PROCESSING,
        { sentAt: campaign.sentAt ?? new Date(), isMock: result.mock },
      );
      await this.dataSource
        .createQueryBuilder()
        .update(SmsCampaign)
        .set({ lastError: () => 'NULL' })
        .where('id = :id', { id: campaign.id })
        .execute();
      await this.state.reconcileCampaign(campaign.id);
      await this.balance.maybeRefundIfTerminal(campaign.id);
    } catch (err) {
      const retryable = err instanceof RetryableProviderError || isRetryable(err);
      const permanent = err instanceof PermanentProviderError;
      batch.lastError = sanitizeProviderError(err instanceof Error ? err.message : 'Gonderim hatasi');
      await this.dataSource.getRepository(SmsCampaignBatch).save(batch);
      await this.dataSource.getRepository(SmsCampaign).update(
        { id: campaign.id },
        { lastError: batch.lastError },
      );
      if (retryable && !permanent) {
        const cooldown =
          err instanceof RetryableProviderError && err.cooldownMs ? err.cooldownMs : 60_000;
        this.logger.warn(`Retryable provider error for batch ${batch.id}: ${batch.lastError}`);
        await this.limiter.pause(campaign.providerId ?? 'mock', cooldown);
        throw err;
      }
      await this.dataSource
        .getRepository(SmsCampaignRecipient)
        .update(
          {
            batchId: batch.id,
            status: In([
              SmsRecipientStatus.PROCESSING,
              SmsRecipientStatus.INCLUDED,
              SmsRecipientStatus.QUEUED,
            ]),
          },
          { status: SmsRecipientStatus.FAILED, lastError: batch.lastError?.slice(0, 250) },
        );
      batch.status =
        permanent || (job.attemptsMade ?? 0) + 1 >= (job.opts?.attempts ?? 3)
          ? SmsBatchStatus.DEAD
          : SmsBatchStatus.FAILED;
      await this.dataSource.getRepository(SmsCampaignBatch).save(batch);
      await this.state.reconcileCampaign(campaign.id);
      await this.balance.maybeRefundIfTerminal(campaign.id);
      if (batch.status !== SmsBatchStatus.DEAD && !permanent) throw err;
    }
  }

  private async requireSendableOriginator(
    campaign: SmsCampaign,
    account: CompanySmsAccount | null,
  ) {
    if (!campaign.originatorId) {
      throw new PermanentProviderError('Kampanyada SMS basligi yok');
    }
    const originator = await this.dataSource.getRepository(CompanyOriginator).findOne({
      where: {
        id: campaign.originatorId,
        companyId: campaign.senderCompanyId,
        status: OriginatorStatus.ACTIVE,
      },
    });
    if (!originator) {
      throw new PermanentProviderError('SMS basligi firmaya ait degil veya aktif degil');
    }
    if (originator.smsAccountId && account && originator.smsAccountId !== account.id) {
      const bound = await this.dataSource.getRepository(CompanySmsAccount).findOne({
        where: { id: originator.smsAccountId },
      });
      if (bound?.username && bound.companyId === originator.companyId) {
        throw new PermanentProviderError('SMS basligi bu hesapta gecerli degil');
      }
    }
    return originator;
  }

  private async loadCredentials(account: CompanySmsAccount | null) {
    const credentials: Record<string, string> = {};
    if (!account) return credentials;
    if (account.username) credentials.username = account.username;
    const password = await this.credentials.retrieve(
      account.companyId,
      CredentialType.SMS_PASSWORD,
      'CompanySmsAccount',
      account.id,
    );
    const apiKey = await this.credentials.retrieve(
      account.companyId,
      CredentialType.SMS_API_KEY,
      'CompanySmsAccount',
      account.id,
    );
    if (password) credentials.password = password;
    if (apiKey) credentials.apiKey = apiKey;
    return credentials;
  }
}

function toCallConfig(
  schema: unknown,
  campaign: SmsCampaign,
  batch: SmsCampaignBatch,
  originatorName: string,
): ProviderCallConfig {
  const api = ((schema ?? {}) as ProviderApiSchema).api ?? {};
  const timeoutMs = Number(api.timeoutMs || process.env.SMS_PROVIDER_TIMEOUT_MS || 15_000);
  return {
    baseUrl: api.baseUrl,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 15_000,
    sendPath: api.sendPath || KOCAELI_API_PATHS.send,
    summaryPath: api.summaryPath || KOCAELI_API_PATHS.summary,
    creditPath: api.creditPath || KOCAELI_API_PATHS.credit,
    creditMethod: api.creditMethod || 'GET',
    sendersPath: api.sendersPath || KOCAELI_API_PATHS.senders,
    gatewaysPath: api.gatewaysPath || KOCAELI_API_PATHS.gateways,
    reportPath: api.reportPath || KOCAELI_API_PATHS.report,
    detailReportPath: api.detailReportPath || KOCAELI_API_PATHS.detailReport,
    gateway: api.gateway,
    commercial: false,
    title: originatorName,
    encoding: toSmsContentEncoding(campaign.encoding),
    packageCustomId: batch.clientReference,
  };
}

function isRetryable(err: unknown) {
  const message = err instanceof Error ? err.message : '';
  return /timeout|ECONNRESET|429|502|503|unavailable/i.test(message);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
