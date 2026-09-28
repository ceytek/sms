import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SmsCampaign } from '../entities/sms-campaign.entity.js';
import { SmsCampaignRecipient } from '../entities/sms-campaign-recipient.entity.js';
import { SmsRecipientStatus } from '../../../common/enums/sms-recipient-status.enum.js';
import { SmsCampaignStatus } from '../../../common/enums/sms-campaign-status.enum.js';
import { DELIVERY_ALLOWED_FROM } from '../sms-callback.js';

@Injectable()
export class CampaignStateService {
  constructor(private readonly dataSource: DataSource) {}

  async transitionRecipient(
    recipientId: string,
    from: SmsRecipientStatus[],
    to: SmsRecipientStatus,
    patch: Partial<SmsCampaignRecipient> = {},
  ) {
    const set: Record<string, unknown> = { status: to };
    if (patch.providerMessageId !== undefined) set.providerMessageId = patch.providerMessageId;
    if (patch.providerState !== undefined) set.providerState = patch.providerState;
    if (patch.clientReference !== undefined) set.clientReference = patch.clientReference;
    if (patch.batchId !== undefined) set.batchId = patch.batchId;
    if (patch.lastError !== undefined) set.lastError = patch.lastError;
    if (patch.claimedAt) set.claimedAt = patch.claimedAt;
    if (patch.acceptedAt) set.acceptedAt = patch.acceptedAt;
    if (patch.deliveredAt) set.deliveredAt = patch.deliveredAt;
    if (patch.sendAttempt !== undefined) set.sendAttempt = patch.sendAttempt;

    const result = await this.dataSource
      .createQueryBuilder()
      .update(SmsCampaignRecipient)
      .set(set)
      .where('id = :id', { id: recipientId })
      .andWhere('status IN (:...from)', { from })
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async applyDelivery(
    clientReference: string,
    status: SmsRecipientStatus,
    extras: { providerMessageId?: string; error?: string; providerState?: string } = {},
  ) {
    const from = DELIVERY_ALLOWED_FROM[status];
    if (!from) return false;

    const set: Record<string, unknown> = { status };
    if (extras.providerMessageId) set.providerMessageId = extras.providerMessageId;
    if (extras.providerState) set.providerState = extras.providerState;
    if (extras.error) set.lastError = extras.error;
    if (status === SmsRecipientStatus.ACCEPTED) {
      set.acceptedAt = new Date();
    }
    if (status === SmsRecipientStatus.DELIVERED) {
      set.deliveredAt = new Date();
    }

    const qb = this.dataSource
      .createQueryBuilder()
      .update(SmsCampaignRecipient)
      .set(set)
      .where('client_reference = :ref', { ref: clientReference })
      .andWhere('status IN (:...from)', { from });
    const result = await qb.execute();
    if (!(result.affected ?? 0)) return false;
    const row = await this.dataSource.getRepository(SmsCampaignRecipient).findOne({
      where: { clientReference },
    });
    if (row) await this.reconcileCampaign(row.campaignId);
    return true;
  }

  async reconcileCampaign(campaignId: string) {
    await this.dataSource.query(
      `UPDATE sms_campaigns c SET
         raw_recipient_count = s.raw,
         valid_recipient_count = s.valid,
         queued_count = s.queued,
         processing_count = s.processing,
         accepted_count = s.accepted,
         delivered_count = s.delivered,
         fail_count = s.failed,
         success_count = s.delivered,
         invalid_count = s.invalid,
         duplicate_count = s.duplicate,
         excluded_count = s.excluded,
         blacklist_count = s.blacklist,
         consent_excluded_count = s.noconsent,
         passive_count = s.passive,
         actual_units = s.units,
         status = CASE
           WHEN c.status IN ('CANCELLED', 'DRAFT', 'SCHEDULED', 'PREPARING', 'READY') THEN c.status
           WHEN s.processing + s.queued + s.included = 0 AND s.failed > 0 AND s.accepted + s.delivered = 0 THEN 'FAILED'::sms_campaign_status_enum
           WHEN s.processing + s.queued + s.included = 0 AND s.failed > 0 THEN 'PARTIALLY_COMPLETED'::sms_campaign_status_enum
           WHEN s.processing + s.queued + s.included = 0 AND s.accepted + s.delivered > 0 THEN 'COMPLETED'::sms_campaign_status_enum
           WHEN s.processing + s.accepted + s.delivered > 0 THEN 'PROCESSING'::sms_campaign_status_enum
           ELSE c.status
         END
       FROM (
         SELECT
           campaign_id,
           COUNT(*)::int AS raw,
           COUNT(*) FILTER (WHERE status NOT IN ('INVALID','DUPLICATE','EXCLUDED'))::int AS valid,
           COUNT(*) FILTER (WHERE status = 'INCLUDED')::int AS included,
           COUNT(*) FILTER (WHERE status = 'QUEUED')::int AS queued,
           COUNT(*) FILTER (WHERE status = 'PROCESSING')::int AS processing,
           COUNT(*) FILTER (WHERE status IN ('ACCEPTED','SENT','DELIVERED'))::int AS accepted,
           COUNT(*) FILTER (WHERE status = 'DELIVERED')::int AS delivered,
           COUNT(*) FILTER (WHERE status IN ('FAILED','EXPIRED','REJECTED'))::int AS failed,
           COUNT(*) FILTER (WHERE status = 'INVALID')::int AS invalid,
           COUNT(*) FILTER (WHERE status = 'DUPLICATE')::int AS duplicate,
           COUNT(*) FILTER (WHERE status = 'EXCLUDED')::int AS excluded,
           COUNT(*) FILTER (WHERE exclude_reason = 'BLACKLIST')::int AS blacklist,
           COUNT(*) FILTER (WHERE exclude_reason = 'NO_CONSENT')::int AS noconsent,
           COUNT(*) FILTER (WHERE exclude_reason = 'PASSIVE')::int AS passive,
           COALESCE(SUM(sms_parts) FILTER (WHERE status NOT IN ('INVALID','DUPLICATE','EXCLUDED')), 0)::int AS units
         FROM sms_campaign_recipients
         WHERE campaign_id = $1
         GROUP BY campaign_id
       ) s
       WHERE c.id = s.campaign_id`,
      [campaignId],
    );
  }

  async markCampaign(id: string, from: SmsCampaignStatus[], to: SmsCampaignStatus, extra: Partial<SmsCampaign> = {}) {
    const result = await this.dataSource
      .createQueryBuilder()
      .update(SmsCampaign)
      .set({ ...extra, status: to })
      .where('id = :id', { id })
      .andWhere('status IN (:...from)', { from })
      .execute();
    if (!(result.affected ?? 0)) return null;
    return this.dataSource.getRepository(SmsCampaign).findOne({ where: { id } });
  }
}
