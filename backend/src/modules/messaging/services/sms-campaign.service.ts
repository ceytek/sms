import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In, QueryFailedError } from 'typeorm';
import { SmsCampaign } from '../entities/sms-campaign.entity.js';
import { SmsCampaignSource } from '../entities/sms-campaign-source.entity.js';
import { SmsCampaignBatch } from '../entities/sms-campaign-batch.entity.js';
import { SmsCampaignRecipient } from '../entities/sms-campaign-recipient.entity.js';
import { SmsTemplate } from '../entities/sms-template.entity.js';
import { CompanyOriginator } from '../../companies/entities/company-originator.entity.js';
import { CompanySmsAccount } from '../../companies/entities/company-sms-account.entity.js';
import { CompanyService } from '../../companies/entities/company-service.entity.js';
import { KvkkSetting } from '../../kvkk/entities/kvkk-setting.entity.js';
import { SmsProvider } from '../../reference/entities/sms-provider.entity.js';
import { OriginatorStatus } from '../../../common/enums/originator-status.enum.js';
import { SmsAudienceSource } from '../../../common/enums/sms-audience-source.enum.js';
import { SmsCampaignSourceType } from '../../../common/enums/sms-campaign-source-type.enum.js';
import { SmsCampaignStatus } from '../../../common/enums/sms-campaign-status.enum.js';
import { SmsRecipientStatus } from '../../../common/enums/sms-recipient-status.enum.js';
import { SmsSendType } from '../../../common/enums/sms-send-type.enum.js';
import { SmsBatchStatus } from '../../../common/enums/sms-batch-status.enum.js';
import { Role } from '../../../common/enums/role.enum.js';
import { hasPersonalization, smsEncodingAndParts } from '../sms-text.js';
import { CreateSmsCampaignDto, CampaignSourceDto } from '../dto/create-sms-campaign.dto.js';
import { SmsQueueService } from '../queue/sms-queue.service.js';
import { ProviderRateLimiter } from '../queue/provider-rate-limiter.js';
import { SmsBalanceService } from './sms-balance.service.js';
import { CampaignStateService } from './campaign-state.service.js';
import { SmsPrepareService } from './sms-prepare.service.js';
import { SmsSendService } from './sms-send.service.js';
import { SmsAccountResolverService } from './sms-account-resolver.service.js';
import { AuditService } from '../../audit/audit.service.js';
import { isSmsProviderLiveMode, SmsProviderRegistry } from '../adapters/sms-provider.registry.js';
import { mapCallbackStatus, normalizeWebhookPayload, xidToRecipientId } from '../sms-callback.js';
import { batchCustomId } from '../adapters/provider-ids.js';
import { KVKK_SERVICE_CODE } from '../../kvkk/services/kvkk-access.service.js';
import { SmsExcludeReason } from '../../../common/enums/sms-exclude-reason.enum.js';
import { Contact } from '../../contacts/entities/contact.entity.js';
import { CheckRestrictedPhonesDto } from '../dto/check-restricted-phones.dto.js';
import { formatTrMobile } from '../../../common/phone/normalize-tr-mobile.js';

type Actor = { id: string; role: string; companyId: string };

@Injectable()
export class SmsCampaignService {
  private readonly logger = new Logger(SmsCampaignService.name);
  private readonly draining = new Set<string>();

  constructor(
    private readonly dataSource: DataSource,
    private readonly queue: SmsQueueService,
    private readonly limiter: ProviderRateLimiter,
    private readonly balance: SmsBalanceService,
    private readonly state: CampaignStateService,
    private readonly prepare: SmsPrepareService,
    private readonly send: SmsSendService,
    private readonly smsAccounts: SmsAccountResolverService,
    private readonly audit: AuditService,
    private readonly registry: SmsProviderRegistry,
  ) {}

  async create(dto: CreateSmsCampaignDto, actor: Actor) {
    this.assertCompany(actor);
    const existing = await this.dataSource.getRepository(SmsCampaign).findOne({
      where: { senderCompanyId: actor.companyId, idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      if (
        !existing.preparedAt &&
        existing.status !== SmsCampaignStatus.SCHEDULED &&
        existing.status !== SmsCampaignStatus.CANCELLED
      ) {
        await this.prepare.prepare(existing.id);
      }
      return this.toSummary(await this.requireOwned(existing.id, actor));
    }

    const account = await this.smsAccounts.resolve(actor.companyId);
    const originator = await this.requireOriginator(actor.companyId, dto.originatorId, account);
    const kvkkCheckEnabled = await this.shouldCheckKvkk(actor.companyId);
    const { encoding, parts } = smsEncodingAndParts(dto.body);
    const estimatedUnits = Math.max(1, dto.sources.reduce((sum, source) => sum + (source.phones?.length ?? 0), 0)) * parts;
    const estimate = await this.balance.estimateOk(actor.companyId, estimatedUnits);

    const audienceSource =
      dto.sources.length === 1
        ? this.mapAudience(dto.sources[0].type)
        : SmsAudienceSource.MIXED;
    const scheduledAt = dto.mode === 'SCHEDULE' && dto.scheduledAt ? new Date(dto.scheduledAt) : undefined;
    if ((dto.mode === 'SCHEDULE' || dto.composition === 'SCHEDULED') && (!scheduledAt || scheduledAt.getTime() <= Date.now())) {
      throw new BadRequestException('Planlanan zaman gelecekte olmalı');
    }
    if (dto.composition === 'SINGLE') {
      const recipients = dto.sources.reduce(
        (sum, source) => sum + (source.phones?.length ?? 0) + (source.contactIds?.length ?? 0),
        0,
      );
      if (recipients !== 1) {
        throw new BadRequestException('Tekil SMS yalnızca bir numaraya gönderilir');
      }
    }

    let campaign: SmsCampaign;
    try {
      campaign = await this.dataSource.getRepository(SmsCampaign).save(
        this.dataSource.getRepository(SmsCampaign).create({
          senderCompanyId: actor.companyId,
          createdBy: actor.id,
          idempotencyKey: dto.idempotencyKey,
          sendType:
            actor.role === Role.CUSTOMER ? SmsSendType.CUSTOMER_TO_RECIPIENTS : SmsSendType.DEALER_TO_CUSTOMERS,
          audienceSource,
          status: dto.mode === 'SCHEDULE' || dto.composition === 'SCHEDULED' ? SmsCampaignStatus.SCHEDULED : SmsCampaignStatus.DRAFT,
          name: dto.name?.trim() || undefined,
          category: dto.category,
          composition: dto.composition || 'BULK',
          body: dto.body.trim(),
          encoding,
          smsParts: parts,
          estimatedUnits,
          originatorId: originator.id,
          originatorName: originator.name,
          providerId: account?.providerId,
          smsAccountId: account?.id,
          isMock: !isSmsProviderLiveMode(),
          kvkkCheckEnabled,
          scheduledAt,
        }),
      );
    } catch (err) {
      if (isUniqueViolation(err)) {
        const raced = await this.dataSource.getRepository(SmsCampaign).findOne({
          where: { senderCompanyId: actor.companyId, idempotencyKey: dto.idempotencyKey },
        });
        if (raced) return this.toSummary(raced);
      }
      throw err;
    }

    await this.dataSource.getRepository(SmsCampaignSource).save(
      dto.sources.map((source) =>
        this.dataSource.getRepository(SmsCampaignSource).create(this.toSourceRow(campaign.id, source, actor)),
      ),
    );

    await this.audit.log(
      'CREATE',
      'SmsCampaign',
      campaign.id,
      actor.id,
      actor.companyId,
      null,
      {
        mode: dto.mode,
        originatorId: originator.id,
        originatorName: originator.name,
        providerId: account?.providerId,
        smsAccountId: account?.id,
        sources: dto.sources.map((item) => item.type),
      },
    );

    if (dto.mode === 'SCHEDULE' && scheduledAt) {
      await this.queue.enqueueScheduled(campaign.id, actor.companyId, scheduledAt.getTime() - Date.now());
    } else if (!dto.sources.some((source) => source.type === SmsCampaignSourceType.FILE && !source.phones?.length)) {
      campaign = await this.prepare.prepare(campaign.id);
    }

    return {
      ...(await this.toSummary(campaign)),
      wallet: estimate,
      personalized: hasPersonalization(dto.body),
    };
  }

  async confirm(id: string, actor: Actor) {
    const campaign = await this.requireOwned(id, actor);
    if (campaign.status === SmsCampaignStatus.CANCELLED) {
      throw new BadRequestException('İptal edilmiş kampanya gönderilemez');
    }
    if (campaign.confirmedAt) {
      return this.toSummary(campaign);
    }
    if (
      campaign.status === SmsCampaignStatus.SCHEDULED &&
      campaign.scheduledAt &&
      campaign.scheduledAt.getTime() > Date.now() &&
      actor.id !== 'system'
    ) {
      throw new BadRequestException('Planlanmış kampanya henüz gönderim zamanına gelmedi');
    }
    if (!campaign.preparedAt || campaign.status === SmsCampaignStatus.PREPARING) {
      throw new BadRequestException('Alıcı listesi henüz hazır değil');
    }
    await this.state.reconcileCampaign(campaign.id);
    const fresh = await this.requireOwned(id, actor);
    if (!fresh.validRecipientCount) {
      throw new BadRequestException(
        'Gönderilebilir numara yok. Yasaklı ve SMS gönderilmeyecek numaralar nihai listeden çıkarıldı.',
      );
    }
    if (isSmsProviderLiveMode() && !fresh.isMock) {
      const account = await this.smsAccounts.resolve(fresh.senderCompanyId);
      if (!account) {
        throw new BadRequestException(
          'Üst bayi SMS hesabı yok. Admin → SMS Sağlayıcılar içine VoiceTelekom kullanıcı adı ve şifresini kaydedin.',
        );
      }
    }
    const units = Math.max(fresh.actualUnits, fresh.validRecipientCount * (fresh.smsParts || 1));
    const estimate = await this.balance.estimateOk(fresh.senderCompanyId, units);
    if (!estimate.ok) {
      throw new BadRequestException(
        `Yetersiz SMS kredisi. Gerekli ${units}, mevcut ${estimate.balance}. ${Math.ceil(units - estimate.balance)} kredi daha yükleyin.`,
      );
    }
    const reserved = await this.balance.reserve(fresh, units, actor.id);
    await this.enqueueBatches(reserved);
    await this.state.markCampaign(
      reserved.id,
      [
        SmsCampaignStatus.READY,
        SmsCampaignStatus.DRAFT,
        SmsCampaignStatus.QUEUED,
        SmsCampaignStatus.SCHEDULED,
        SmsCampaignStatus.PROCESSING,
      ],
      SmsCampaignStatus.PROCESSING,
      { confirmedAt: reserved.confirmedAt ?? new Date() },
    );
    if (!isSmsProviderLiveMode()) {
      void this.dispatchPendingBatches(reserved).catch((err) => {
        this.logger.warn(
          `Inline send after confirm failed for ${reserved.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    }
    await this.audit.log('CONFIRM', 'SmsCampaign', reserved.id, actor.id, actor.companyId, null, {
      units: reserved.reservedUnits,
      providerId: reserved.providerId,
      originatorName: reserved.originatorName,
    });
    return this.toSummary(await this.requireOwned(id, actor));
  }

  async cancel(id: string, actor: Actor) {
    const campaign = await this.requireOwned(id, actor);
    if ([SmsCampaignStatus.COMPLETED, SmsCampaignStatus.CANCELLED].includes(campaign.status)) {
      throw new BadRequestException('Kampanya iptal edilemez');
    }
    await this.state.markCampaign(
      campaign.id,
      [
        SmsCampaignStatus.DRAFT,
        SmsCampaignStatus.SCHEDULED,
        SmsCampaignStatus.QUEUED,
        SmsCampaignStatus.PREPARING,
        SmsCampaignStatus.READY,
        SmsCampaignStatus.PROCESSING,
        SmsCampaignStatus.SENDING,
      ],
      SmsCampaignStatus.CANCELLED,
      { cancelledAt: new Date() },
    );
    await this.dataSource.getRepository(SmsCampaignBatch).update(
      { campaignId: campaign.id, status: In([SmsBatchStatus.PENDING, SmsBatchStatus.FAILED]) },
      { status: SmsBatchStatus.CANCELLED },
    );
    await this.dataSource
      .getRepository(SmsCampaignRecipient)
      .createQueryBuilder()
      .update()
      .set({ status: SmsRecipientStatus.EXCLUDED, excludeReason: SmsExcludeReason.CANCELLED })
      .where('campaign_id = :id', { id: campaign.id })
      .andWhere('status IN (:...statuses)', {
        statuses: [SmsRecipientStatus.INCLUDED, SmsRecipientStatus.QUEUED],
      })
      .execute();
    const adapter = this.registry.resolve();
    const processing = await this.dataSource.getRepository(SmsCampaignRecipient).find({
      where: { campaignId: campaign.id, status: SmsRecipientStatus.PROCESSING },
    });
    for (const row of processing) {
      if (!row.clientReference) {
        await this.state.transitionRecipient(row.id, [SmsRecipientStatus.PROCESSING], SmsRecipientStatus.EXCLUDED, {
          lastError: 'cancelled',
        });
        continue;
      }
      const found = await adapter.queryByReference(row.clientReference);
      if (found && (found.status === 'ACCEPTED' || found.status === 'SENT' || found.status === 'DELIVERED')) {
        await this.state.applyDelivery(row.clientReference, SmsRecipientStatus.ACCEPTED, {
          providerMessageId: found.providerMessageId,
        });
      } else {
        await this.state.transitionRecipient(row.id, [SmsRecipientStatus.PROCESSING], SmsRecipientStatus.EXCLUDED, {
          lastError: 'cancelled',
        });
      }
    }
    await this.state.reconcileCampaign(campaign.id);
    await this.balance.maybeRefundIfTerminal(campaign.id, actor.id);
    await this.audit.log('CANCEL', 'SmsCampaign', campaign.id, actor.id, actor.companyId, null, null);
    return this.toSummary(await this.requireOwned(id, actor));
  }

  async progress(id: string, actor: Actor) {
    const campaign = await this.requireOwned(id, actor);
    if (
      !isSmsProviderLiveMode() &&
      campaign.confirmedAt &&
      campaign.status !== SmsCampaignStatus.CANCELLED &&
      campaign.status !== SmsCampaignStatus.COMPLETED &&
      ((campaign.queuedCount || 0) > 0 || (campaign.processingCount || 0) > 0)
    ) {
      void this.drainQueuedBatches(campaign);
    }
    await this.state.reconcileCampaign(campaign.id);
    const fresh = await this.requireOwned(id, actor);
    const balance = await this.balance.currentSmsBalance(actor.companyId);
    const blockedSamples = await this.dataSource.getRepository(SmsCampaignRecipient).find({
      where: {
        campaignId: fresh.id,
        status: SmsRecipientStatus.EXCLUDED,
        excludeReason: In([SmsExcludeReason.BLACKLIST, SmsExcludeReason.SMS_BLOCKED]),
      },
      order: { excludeReason: 'ASC', id: 'ASC' },
      take: 12,
    });
    const smsBlockedCount = await this.dataSource.getRepository(SmsCampaignRecipient).count({
      where: { campaignId: fresh.id, excludeReason: SmsExcludeReason.SMS_BLOCKED },
    });
    return {
      id: fresh.id,
      status: fresh.status,
      name: fresh.name,
      category: fresh.category,
      composition: fresh.composition,
      originatorName: fresh.originatorName,
      body: fresh.body,
      encoding: fresh.encoding,
      smsParts: fresh.smsParts,
      personalized: hasPersonalization(fresh.body),
      rawRecipientCount: fresh.rawRecipientCount || fresh.validRecipientCount + fresh.invalidCount + fresh.duplicateCount + fresh.excludedCount,
      validRecipientCount: fresh.validRecipientCount,
      invalidCount: fresh.invalidCount,
      duplicateCount: fresh.duplicateCount,
      excludedCount: fresh.excludedCount,
      blacklistCount: fresh.blacklistCount,
      smsBlockedCount,
      consentExcludedCount: fresh.consentExcludedCount,
      passiveCount: fresh.passiveCount,
      queuedCount: fresh.queuedCount,
      processingCount: fresh.processingCount,
      acceptedCount: fresh.acceptedCount,
      deliveredCount: fresh.deliveredCount,
      failCount: fresh.failCount,
      estimatedUnits: fresh.estimatedUnits,
      actualUnits: fresh.actualUnits,
      reservedUnits: fresh.reservedUnits,
      walletBalance: balance,
      usedUnits: await this.balance.usedUnits(fresh.id),
      createdAt: fresh.createdAt,
      sentAt: fresh.sentAt,
      audienceSource: fresh.audienceSource,
      sendType: fresh.sendType,
      originatorId: fresh.originatorId,
      scheduledAt: fresh.scheduledAt,
      preparedAt: fresh.preparedAt,
      confirmedAt: fresh.confirmedAt,
      isMock: fresh.isMock,
      kvkkCheckEnabled: fresh.kvkkCheckEnabled,
      lastError: fresh.lastError,
      blockedSamples: blockedSamples.map((row) => ({
        mobile: formatTrMobile(row.mobileNormalized) || row.mobileRaw || row.mobileNormalized,
        reason: row.excludeReason,
      })),
    };
  }

  async previewRestricted(dto: CheckRestrictedPhonesDto, actor: Actor) {
    this.assertCompany(actor);
    await this.requireOriginator(actor.companyId, dto.originatorId);
    const phones = [...(dto.phones ?? [])];
    if (dto.contactIds?.length) {
      const contacts = await this.dataSource.getRepository(Contact).find({
        where: { id: In(dto.contactIds), ownerCompanyId: actor.companyId },
        select: ['id', 'mobilePhone', 'normalizedPhone'],
      });
      phones.push(...contacts.map((row) => row.normalizedPhone || row.mobilePhone));
    }
    return this.prepare.findRestrictedPhones(actor.companyId, dto.originatorId, phones);
  }

  async list(
    actor: Actor,
    query: { page?: number; limit?: number; search?: string; status?: string; from?: string; to?: string } = {},
  ) {
    this.assertCompany(actor);
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const qb = this.dataSource
      .getRepository(SmsCampaign)
      .createQueryBuilder('campaign')
      .where('campaign.senderCompanyId = :companyId', { companyId: actor.companyId });

    const search = query.search?.trim();
    if (search) {
      qb.andWhere('(campaign.body ILIKE :search OR campaign.originatorName ILIKE :search OR campaign.name ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    const statuses = campaignStatusGroup(query.status);
    if (statuses?.length) {
      qb.andWhere('campaign.status IN (:...statuses)', { statuses });
    }
    if (query.from && /^\d{4}-\d{2}-\d{2}$/.test(query.from)) {
      qb.andWhere('campaign.createdAt >= :from', { from: `${query.from}T00:00:00.000Z` });
    }
    if (query.to && /^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
      qb.andWhere('campaign.createdAt <= :to', { to: `${query.to}T23:59:59.999Z` });
    }

    const [items, total] = await qb
      .orderBy('campaign.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((item) => ({
        id: item.id,
        status: item.status,
        body: item.body,
        name: item.name,
        category: item.category,
        composition: item.composition,
        originatorName: item.originatorName,
        validRecipientCount: item.validRecipientCount,
        acceptedCount: item.acceptedCount,
        deliveredCount: item.deliveredCount,
        failCount: item.failCount,
        queuedCount: item.queuedCount,
        processingCount: item.processingCount,
        createdAt: item.createdAt,
        scheduledAt: item.scheduledAt,
      })),
      summary: await this.reportSummary(actor.companyId),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  private async reportSummary(companyId: string) {
    const [row] = await this.dataSource.query(
      `SELECT
         COUNT(*)::int AS campaigns,
         COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()))::int AS campaigns_this,
         COUNT(*) FILTER (
           WHERE created_at >= date_trunc('month', now()) - interval '1 month'
             AND created_at < date_trunc('month', now())
         )::int AS campaigns_prev,
         COALESCE(SUM(valid_recipient_count), 0)::int AS recipients,
         COALESCE(SUM(valid_recipient_count) FILTER (WHERE created_at >= date_trunc('month', now())), 0)::int AS recipients_this,
         COALESCE(SUM(valid_recipient_count) FILTER (
           WHERE created_at >= date_trunc('month', now()) - interval '1 month'
             AND created_at < date_trunc('month', now())
         ), 0)::int AS recipients_prev,
         COALESCE(SUM(accepted_count), 0)::int AS delivered,
         COALESCE(SUM(fail_count), 0)::int AS failed,
         COALESCE(SUM(queued_count + processing_count), 0)::int AS pending
       FROM sms_campaigns
       WHERE sender_company_id = $1`,
      [companyId],
    );
    return {
      campaigns: Number(row?.campaigns || 0),
      recipients: Number(row?.recipients || 0),
      delivered: Number(row?.delivered || 0),
      failed: Number(row?.failed || 0),
      pending: Number(row?.pending || 0),
      campaignDelta: monthDelta(Number(row?.campaigns_this || 0), Number(row?.campaigns_prev || 0)),
      recipientDelta: monthDelta(Number(row?.recipients_this || 0), Number(row?.recipients_prev || 0)),
    };
  }

  async recipients(
    id: string,
    actor: Actor,
    status: string | undefined,
    page = 1,
    limit = 50,
    excludeReason?: string,
  ) {
    await this.requireOwned(id, actor);
    const allowedStatus = Object.values(SmsRecipientStatus) as string[];
    const where: Record<string, unknown> = { campaignId: id };
    if (status && allowedStatus.includes(status)) where.status = status;
    if (excludeReason) {
      where.excludeReason = excludeReason;
      where.status = SmsRecipientStatus.EXCLUDED;
    }
    const [items, total] = await this.dataSource.getRepository(SmsCampaignRecipient).findAndCount({
      where,
      order: { id: 'ASC' },
      skip: (page - 1) * limit,
      take: Math.min(100, limit),
    });
    return {
      items: items.map((row) => ({
        id: row.id,
        mobile: formatTrMobile(row.mobileNormalized) || row.mobileRaw,
        name: row.displayName,
        status: row.status,
        excludeReason: row.excludeReason,
        lastError: row.lastError,
        smsParts: row.smsParts,
        actedAt: row.deliveredAt || row.acceptedAt || row.claimedAt,
      })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async exportCsv(id: string, actor: Actor, status?: string) {
    await this.requireOwned(id, actor);
    const where: Record<string, unknown> = { campaignId: id };
    if (status) where.status = status;
    const rows = await this.dataSource.getRepository(SmsCampaignRecipient).find({
      where,
      order: { id: 'ASC' },
      take: 100000,
    });
    const header = 'telefon,ad,durum,neden,hata,parca';
    const lines = rows.map((row) =>
      [row.mobileNormalized || row.mobileRaw, row.displayName, row.status, row.excludeReason, row.lastError, row.smsParts]
        .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(','),
    );
    return `${header}\n${lines.join('\n')}`;
  }

  async originators(actor: Actor) {
    this.assertCompany(actor);
    const items = await this.dataSource.getRepository(CompanyOriginator).find({
      where: { companyId: actor.companyId, status: OriginatorStatus.ACTIVE },
      order: { name: 'ASC' },
    });
    return { items: items.map((item) => ({ id: item.id, name: item.name })) };
  }

  async templates(actor: Actor) {
    this.assertCompany(actor);
    const items = await this.dataSource.getRepository(SmsTemplate).find({
      where: { ownerCompanyId: actor.companyId },
      order: { updatedAt: 'DESC' },
    });
    return { items };
  }

  async saveTemplate(actor: Actor, name: string, body: string) {
    this.assertCompany(actor);
    const saved = await this.dataSource.getRepository(SmsTemplate).save(
      this.dataSource.getRepository(SmsTemplate).create({
        ownerCompanyId: actor.companyId,
        name: name.trim(),
        body: body.trim(),
        createdBy: actor.id,
      }),
    );
    return saved;
  }

  async updateTemplate(id: string, actor: Actor, name: string, body: string) {
    const template = await this.requireTemplate(id, actor);
    template.name = name.trim();
    template.body = body.trim();
    return this.dataSource.getRepository(SmsTemplate).save(template);
  }

  async deleteTemplate(id: string, actor: Actor) {
    const template = await this.requireTemplate(id, actor);
    await this.dataSource.getRepository(SmsTemplate).remove(template);
    return { ok: true };
  }

  private async requireTemplate(id: string, actor: Actor) {
    this.assertCompany(actor);
    const template = await this.dataSource.getRepository(SmsTemplate).findOne({ where: { id } });
    if (!template || template.ownerCompanyId !== actor.companyId) {
      throw new NotFoundException('Şablon bulunamadı');
    }
    return template;
  }

  async startPrepare(id: string, actor: Actor) {
    const campaign = await this.requireOwned(id, actor);
    if (campaign.confirmedAt) {
      throw new BadRequestException('Onaylanmış kampanya yeniden hazırlanamaz');
    }
    if (
      [SmsCampaignStatus.DRAFT, SmsCampaignStatus.READY, SmsCampaignStatus.PREPARING, SmsCampaignStatus.SCHEDULED].includes(
        campaign.status,
      )
    ) {
      await this.dataSource
        .getRepository(SmsCampaign)
        .createQueryBuilder()
        .update()
        .set({
          preparedAt: () => 'NULL',
          status:
            campaign.status === SmsCampaignStatus.SCHEDULED
              ? SmsCampaignStatus.SCHEDULED
              : SmsCampaignStatus.DRAFT,
        })
        .where('id = :id', { id: campaign.id })
        .execute();
    }
    await this.prepare.prepare(campaign.id);
    return this.toSummary(await this.requireOwned(id, actor));
  }

  async retryDead(id: string, actor: Actor) {
    const campaign = await this.requireOwned(id, actor);
    await this.dataSource
      .createQueryBuilder()
      .update(SmsCampaign)
      .set({ lastError: () => 'NULL' })
      .where('id = :id', { id: campaign.id })
      .execute();
    const retryable = await this.dataSource.getRepository(SmsCampaignBatch).find({
      where: {
        campaignId: campaign.id,
        status: In([SmsBatchStatus.DEAD, SmsBatchStatus.FAILED, SmsBatchStatus.PENDING]),
      },
    });
    for (const batch of retryable) {
      batch.status = SmsBatchStatus.PENDING;
      batch.lastError = undefined;
      await this.dataSource.getRepository(SmsCampaignBatch).save(batch);
    }
    const retryCount = await this.dataSource.getRepository(SmsCampaignRecipient).count({
      where: {
        campaignId: campaign.id,
        status: In([SmsRecipientStatus.FAILED, SmsRecipientStatus.REJECTED, SmsRecipientStatus.EXPIRED]),
      },
    });
    await this.dataSource
      .getRepository(SmsCampaignRecipient)
      .createQueryBuilder()
      .update()
      .set({ status: SmsRecipientStatus.QUEUED, lastError: () => 'NULL' })
      .where('campaign_id = :campaignId', { campaignId: campaign.id })
      .andWhere('status IN (:...statuses)', {
        statuses: [SmsRecipientStatus.FAILED, SmsRecipientStatus.REJECTED, SmsRecipientStatus.EXPIRED],
      })
      .execute();
    const retryUnits = retryCount * (campaign.smsParts || 1);
    const used = await this.balance.usedUnits(campaign.id);
    const extra = Math.max(0, retryUnits - Math.max(0, campaign.reservedUnits - used));
    const funded = await this.balance.reserveAdditional(campaign, extra, actor.id);
    await this.enqueueBatches(funded);
    if (!isSmsProviderLiveMode()) {
      await this.dispatchPendingBatches(campaign);
    }
    return { retried: retryable.length };
  }

  async metrics() {
    return this.queue.depth();
  }

  async handleProviderCallback(payload: {
    clientReference?: string;
    messageId?: string;
    status?: string;
    customID?: string;
    pkgID?: string | number;
    state?: string | number;
    data?: Record<string, unknown>;
  }) {
    const normalized = normalizeWebhookPayload(payload as Record<string, unknown>);
    const mapped = mapCallbackStatus(normalized.status);
    const extras = {
      providerMessageId: normalized.messageId,
      providerState: normalized.providerState,
    };
    const recipientId = xidToRecipientId(normalized.xid);
    if (recipientId) {
      const row = await this.dataSource.getRepository(SmsCampaignRecipient).findOne({ where: { id: recipientId } });
      if (row?.clientReference) {
        const status = mapped ?? SmsRecipientStatus.ACCEPTED;
        const changed = await this.state.applyDelivery(row.clientReference, status, extras);
        if (changed) await this.balance.maybeRefundIfTerminal(row.campaignId);
        return { ok: true, changed };
      }
    }
    const ref = normalized.clientReference;
    if (ref) {
      const byRef = await this.dataSource.getRepository(SmsCampaignRecipient).findOne({
        where: { clientReference: ref },
      });
      if (byRef) {
        if (!mapped) {
          return { ok: true, changed: false };
        }
        const changed = await this.state.applyDelivery(ref, mapped, extras);
        if (changed) await this.balance.maybeRefundIfTerminal(byRef.campaignId);
        return { ok: true, changed };
      }
      const batch = await this.dataSource.getRepository(SmsCampaignBatch).findOne({
        where: { clientReference: ref },
      });
      if (batch) {
        if (normalized.messageId) {
          batch.providerPackageId = normalized.messageId;
          await this.dataSource.getRepository(SmsCampaignBatch).save(batch);
        }
        const rows = await this.dataSource.getRepository(SmsCampaignRecipient).find({
          where: { batchId: batch.id, status: In([SmsRecipientStatus.PROCESSING, SmsRecipientStatus.QUEUED]) },
        });
        let changed = false;
        for (const row of rows) {
          if (!row.clientReference) continue;
          const ok = await this.state.applyDelivery(row.clientReference, SmsRecipientStatus.ACCEPTED, extras);
          changed = changed || ok;
        }
        if (changed) await this.balance.maybeRefundIfTerminal(batch.campaignId);
        return { ok: true, changed };
      }
    }
    return { ok: false };
  }

  async enqueueBatches(campaign: SmsCampaign) {
    const limits = this.limiter.normalize(
      campaign.providerId
        ? (await this.dataSource.getRepository(SmsProvider).findOne({ where: { id: campaign.providerId } }))
            ?.rateLimits
        : undefined,
    );
    const size = this.limiter.chunkSize(limits);
    const priority = campaign.validRecipientCount > 5000 ? 'bulk' : 'normal';

    const existing = await this.dataSource.getRepository(SmsCampaignBatch).find({
      where: { campaignId: campaign.id },
      order: { sequence: 'ASC' },
    });
    for (const batch of existing) {
      if ([SmsBatchStatus.PENDING, SmsBatchStatus.FAILED].includes(batch.status)) {
        await this.queue.enqueueSendBatch({
          campaignId: campaign.id,
          companyId: campaign.senderCompanyId,
          batchId: batch.id,
          priority,
        });
      }
    }

    const recipients = await this.dataSource
      .getRepository(SmsCampaignRecipient)
      .createQueryBuilder('recipient')
      .select(['recipient.id'])
      .where('recipient.campaign_id = :campaignId', { campaignId: campaign.id })
      .andWhere('recipient.status = :status', { status: SmsRecipientStatus.INCLUDED })
      .andWhere('recipient.batch_id IS NULL')
      .orderBy('recipient.id', 'ASC')
      .getMany();
    let sequence = existing.reduce((max, batch) => Math.max(max, batch.sequence), 0);
    for (let i = 0; i < recipients.length; i += size) {
      const slice = recipients.slice(i, i + size);
      sequence += 1;
      const batch = await this.dataSource.getRepository(SmsCampaignBatch).save(
        this.dataSource.getRepository(SmsCampaignBatch).create({
          campaignId: campaign.id,
          companyId: campaign.senderCompanyId,
          sequence,
          recipientCount: slice.length,
          clientReference: batchCustomId(campaign.id, sequence),
          status: SmsBatchStatus.PENDING,
        }),
      );
      await this.dataSource
        .getRepository(SmsCampaignRecipient)
        .createQueryBuilder()
        .update()
        .set({ batchId: batch.id, status: SmsRecipientStatus.QUEUED })
        .whereInIds(slice.map((row) => row.id))
        .andWhere('status = :status', { status: SmsRecipientStatus.INCLUDED })
        .execute();
      await this.queue.enqueueSendBatch({
        campaignId: campaign.id,
        companyId: campaign.senderCompanyId,
        batchId: batch.id,
        priority,
      });
    }
  }

  async drainQueuedBatches(campaign: SmsCampaign) {
    if (this.draining.has(campaign.id)) return;
    this.draining.add(campaign.id);
    try {
      await this.enqueueBatches(campaign);
      if (!isSmsProviderLiveMode()) {
        await this.dispatchPendingBatches(campaign);
      }
    } catch (err) {
      this.logger.warn(
        `Queue drain failed for ${campaign.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      this.draining.delete(campaign.id);
    }
  }

  private async dispatchPendingBatches(campaign: SmsCampaign) {
    const pending = await this.dataSource
      .getRepository(SmsCampaignBatch)
      .createQueryBuilder('batch')
      .where('batch.campaign_id = :campaignId', { campaignId: campaign.id })
      .andWhere('batch.status <> :cancelled', { cancelled: SmsBatchStatus.CANCELLED })
      .andWhere(
        `EXISTS (
          SELECT 1 FROM sms_campaign_recipients r
          WHERE r.batch_id = batch.id
            AND r.status IN (:...open)
        )`,
        {
          open: [SmsRecipientStatus.INCLUDED, SmsRecipientStatus.QUEUED, SmsRecipientStatus.PROCESSING],
        },
      )
      .orderBy('batch.sequence', 'ASC')
      .getMany();
    for (const batch of pending) {
      try {
        await this.send.dispatchBatch({
          campaignId: campaign.id,
          companyId: campaign.senderCompanyId,
          batchId: batch.id,
        });
      } catch (err) {
        this.logger.warn(
          `Send batch ${batch.id} failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  private toSourceRow(campaignId: string, source: CampaignSourceDto, actor: Actor) {
    return {
      campaignId,
      sourceType: source.type,
      label: source.label || source.type,
      rawCount: source.phones?.length ?? source.contactIds?.length ?? 0,
      groupId: source.groupId,
      tagId: source.tagId,
      subcategoryId: source.subcategoryId,
      payload: {
        contactIds: source.contactIds,
        excludedContactIds: source.excludedContactIds,
        excludedCompanyIds: source.excludedCompanyIds,
        phones: source.phones,
        actorRole: actor.role,
      },
    };
  }

  private mapAudience(type: SmsCampaignSourceType) {
    if (type === SmsCampaignSourceType.CUSTOMER_CATEGORY) return SmsAudienceSource.CUSTOMER_CATEGORY;
    if (type === SmsCampaignSourceType.MANUAL) return SmsAudienceSource.MANUAL_NUMBERS;
    if (type === SmsCampaignSourceType.FILE) return SmsAudienceSource.FILE_IMPORT;
    if (type === SmsCampaignSourceType.CONTACT_GROUP || type === SmsCampaignSourceType.CONTACT_PICK) {
      return SmsAudienceSource.CONTACT_GROUP;
    }
    return SmsAudienceSource.CONTACT_BOOK;
  }

  private async shouldCheckKvkk(companyId: string) {
    const assignment = await this.dataSource
      .getRepository(CompanyService)
      .createQueryBuilder('assignment')
      .innerJoin('assignment.service', 'service')
      .where('assignment.companyId = :companyId', { companyId })
      .andWhere('assignment.isActive = true')
      .andWhere('service.code = :code', { code: KVKK_SERVICE_CODE })
      .getOne();
    if (!assignment) return false;
    const settings = await this.dataSource.getRepository(KvkkSetting).findOne({
      where: { ownerCompanyId: companyId },
    });
    return Boolean(settings?.smsConsentCheckEnabled);
  }

  private async requireOriginator(
    companyId: string,
    originatorId: string,
    account?: CompanySmsAccount | null,
  ) {
    const originator = await this.dataSource.getRepository(CompanyOriginator).findOne({
      where: { id: originatorId, companyId, status: OriginatorStatus.ACTIVE },
    });
    if (!originator) {
      throw new ForbiddenException('Geçerli bir SMS başlığı seçin');
    }
    if (originator.smsAccountId && account && originator.smsAccountId !== account.id) {
      const bound = await this.dataSource.getRepository(CompanySmsAccount).findOne({
        where: { id: originator.smsAccountId },
      });
      if (bound?.username && bound.companyId === originator.companyId) {
        throw new ForbiddenException('Bu SMS başlığı seçili provider hesabında kullanılamaz');
      }
    }
    return originator;
  }

  private async requireOwned(id: string, actor: Actor) {
    this.assertCompany(actor);
    const campaign = await this.dataSource.getRepository(SmsCampaign).findOne({ where: { id } });
    if (!campaign) throw new NotFoundException('Kampanya bulunamadı');
    if (campaign.senderCompanyId !== actor.companyId && actor.role !== Role.ADMIN) {
      throw new ForbiddenException();
    }
    return campaign;
  }

  private assertCompany(actor: Actor) {
    if (!actor.companyId) throw new ForbiddenException('Firma bilgisi bulunamadı');
  }

  private async toSummary(campaign: SmsCampaign) {
    return {
      id: campaign.id,
      status: campaign.status,
      estimatedUnits: campaign.estimatedUnits,
      actualUnits: campaign.actualUnits,
      validRecipientCount: campaign.validRecipientCount,
      message: campaign.status === SmsCampaignStatus.DRAFT || campaign.status === SmsCampaignStatus.PREPARING
        ? 'Kampanya alındı, alıcı listesi hazırlanıyor.'
        : 'Kampanya kaydedildi.',
    };
  }
}

function monthDelta(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

const CAMPAIGN_STATUS_GROUPS: Record<string, SmsCampaignStatus[]> = {
  DRAFT: [SmsCampaignStatus.DRAFT, SmsCampaignStatus.READY, SmsCampaignStatus.PREPARING, SmsCampaignStatus.SCHEDULED],
  PROCESSING: [SmsCampaignStatus.QUEUED, SmsCampaignStatus.SENDING, SmsCampaignStatus.PROCESSING],
  SENT: [
    SmsCampaignStatus.SENT,
    SmsCampaignStatus.COMPLETED,
    SmsCampaignStatus.MOCK_SENT,
    SmsCampaignStatus.PARTIALLY_COMPLETED,
  ],
  FAILED: [SmsCampaignStatus.FAILED],
  CANCELLED: [SmsCampaignStatus.CANCELLED],
};

function campaignStatusGroup(status?: string) {
  if (!status || status === 'ALL') return null;
  return CAMPAIGN_STATUS_GROUPS[status] ?? null;
}

function isUniqueViolation(err: unknown) {
  return err instanceof QueryFailedError && (err as { driverError?: { code?: string } }).driverError?.code === '23505';
}
