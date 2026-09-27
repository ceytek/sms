import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Worker, type ConnectionOptions } from 'bullmq';
import { bullmqConnection } from '../queue/redis.connection.js';
import { SMS_JOB, SMS_QUEUES } from '../queue/sms-queues.js';
import { SmsPrepareService } from './sms-prepare.service.js';
import { SmsSendService } from './sms-send.service.js';
import { SmsCampaignService } from './sms-campaign.service.js';
import { CampaignStateService } from './campaign-state.service.js';
import { SmsBalanceService } from './sms-balance.service.js';
import { SmsQueueService } from '../queue/sms-queue.service.js';
import { DataSource, LessThan } from 'typeorm';
import { SmsCampaignRecipient } from '../entities/sms-campaign-recipient.entity.js';
import { SmsRecipientStatus } from '../../../common/enums/sms-recipient-status.enum.js';
import { SmsProviderRegistry } from '../adapters/sms-provider.registry.js';
import { SmsCampaign } from '../entities/sms-campaign.entity.js';
import { SmsProvider } from '../../reference/entities/sms-provider.entity.js';

@Injectable()
export class SmsWorkerHost implements OnModuleDestroy {
  private readonly logger = new Logger(SmsWorkerHost.name);
  private workers: Worker[] = [];

  constructor(
    private readonly prepare: SmsPrepareService,
    private readonly send: SmsSendService,
    private readonly campaigns: SmsCampaignService,
    private readonly state: CampaignStateService,
    private readonly balance: SmsBalanceService,
    private readonly queue: SmsQueueService,
    private readonly registry: SmsProviderRegistry,
    private readonly dataSource: DataSource,
  ) {}

  async start() {
    const connection = bullmqConnection() as unknown as ConnectionOptions;
    this.workers = [
      new Worker(
        SMS_QUEUES.PREPARE,
        async (job) => {
          const campaignId = job.data.campaignId as string;
          await this.prepare.prepare(campaignId);
          if (job.data.confirmAfterPrepare) {
            await this.campaigns.confirm(campaignId, {
              id: job.data.actorId || 'system',
              role: 'CUSTOMER',
              companyId: job.data.companyId,
            });
          }
        },
        { connection, concurrency: 2 },
      ),
      new Worker(SMS_QUEUES.BULK, (job) => this.send.sendBatch(job), { connection, concurrency: 4 }),
      new Worker(SMS_QUEUES.NORMAL, (job) => this.send.sendBatch(job), { connection, concurrency: 4 }),
      new Worker(SMS_QUEUES.CRITICAL, (job) => this.send.sendBatch(job), { connection, concurrency: 2 }),
      new Worker(
        SMS_QUEUES.CALLBACK,
        async (job) => this.campaigns.handleProviderCallback(job.data),
        { connection, concurrency: 8 },
      ),
      new Worker(
        SMS_QUEUES.SCHEDULED,
        async (job) => {
          if (job.name === SMS_JOB.RECONCILE) {
            if (job.data.all) {
              await this.reconcileStuck();
              return;
            }
            await this.reconcileStuck(job.data.campaignId);
            return;
          }
          await this.prepare.prepare(job.data.campaignId);
          await this.campaigns.confirm(job.data.campaignId, {
            id: job.data.actorId || 'system',
            role: 'CUSTOMER',
            companyId: job.data.companyId,
          });
        },
        { connection, concurrency: 2 },
      ),
    ];
    for (const worker of this.workers) {
      worker.on('failed', (job, err) => {
        this.logger.warn(`Job ${job?.name} ${job?.id} failed: ${err.message}`);
      });
    }
    await this.queue.ensureStuckReconcileRepeat();
    this.logger.log('SMS workers started');
  }

  private async reconcileStuck(campaignId?: string) {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    const where = campaignId
      ? { campaignId, status: SmsRecipientStatus.PROCESSING, claimedAt: LessThan(cutoff) }
      : { status: SmsRecipientStatus.PROCESSING, claimedAt: LessThan(cutoff) };
    const stuck = await this.dataSource.getRepository(SmsCampaignRecipient).find({
      where,
      take: 500,
    });
    const campaignIds = new Set<string>();
    for (const row of stuck) {
      if (!row.clientReference) continue;
      const campaign = await this.dataSource.getRepository(SmsCampaign).findOne({ where: { id: row.campaignId } });
      const provider = campaign?.providerId
        ? await this.dataSource.getRepository(SmsProvider).findOne({ where: { id: campaign.providerId } })
        : null;
      const adapter = this.registry.resolve(provider?.code, { forceMock: Boolean(campaign?.isMock) });
      const found = await adapter.queryByReference(row.clientReference);
      if (found) {
        const status =
          found.status === 'DELIVERED'
            ? SmsRecipientStatus.DELIVERED
            : found.status === 'FAILED'
              ? SmsRecipientStatus.FAILED
              : found.status === 'SENT'
                ? SmsRecipientStatus.SENT
                : SmsRecipientStatus.ACCEPTED;
        await this.state.applyDelivery(row.clientReference, status, {
          providerMessageId: found.providerMessageId,
        });
      }
      campaignIds.add(row.campaignId);
    }
    if (campaignId) campaignIds.add(campaignId);
    for (const id of campaignIds) {
      await this.state.reconcileCampaign(id);
      await this.balance.maybeRefundIfTerminal(id);
    }
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((worker) => worker.close()));
  }
}
