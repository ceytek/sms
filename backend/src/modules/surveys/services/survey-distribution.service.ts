import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import { AuditService } from '../../audit/audit.service.js';
import { SmsCampaignService } from '../../messaging/services/sms-campaign.service.js';
import { DistributeSurveyDto } from '../dto/survey.dto.js';
import { Survey } from '../entities/survey.entity.js';
import type { SurveyActor } from './survey-access.service.js';
import { SurveyService } from './survey.service.js';

@Injectable()
export class SurveyDistributionService {
  constructor(
    private readonly surveys: SurveyService,
    private readonly campaigns: SmsCampaignService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  origin() {
    return (this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(/\/$/, '');
  }

  async distribute(actor: SurveyActor, companyId: string, id: string, dto: DistributeSurveyDto, kind: 'SEND' | 'REMINDER') {
    const survey = await this.surveys.requireOwned(companyId, id);
    if (survey.status !== 'ACTIVE') throw new BadRequestException('SMS yalnızca yayındaki ankete gönderilir');
    const requested = dto.sources ?? [];
    if (!requested.length && kind === 'SEND') throw new BadRequestException('Alıcı seçin');
    const body = this.messageBody(survey, dto.body);
    const sources = kind === 'REMINDER' ? await this.reminderSources(id) : requested;
    if (!sources.length) throw new BadRequestException('Hatırlatılacak kişi yok');
    const idempotencyKey = `survey-${id.slice(0, 8)}-${randomBytes(6).toString('hex')}`;
    const created = await this.campaigns.create(
      {
        idempotencyKey,
        name: survey.name.slice(0, 120),
        category: 'BILGILENDIRME',
        composition: survey.personalized || body.includes('{survey_link}') ? 'PERSONALIZED' : 'BULK',
        originatorId: dto.originatorId,
        body,
        mode: 'SEND',
        surveyId: survey.id,
        sources: sources as never,
      },
      { id: actor.id, role: actor.role, companyId },
    );
    if (!created.validRecipientCount) {
      throw new BadRequestException('Gönderilebilir numara yok. Yasaklı ve geçersiz numaralar elendi.');
    }
    const skippedCount = kind === 'SEND' ? await this.skipAlreadySent(created.id, survey.id) : 0;
    if (skippedCount) {
      const [left] = await this.dataSource.query(
        `SELECT COUNT(*)::int AS remaining
         FROM sms_campaign_recipients
         WHERE campaign_id = $1 AND status IN ('INCLUDED', 'QUEUED')`,
        [created.id],
      );
      if (!Number(left?.remaining)) {
        throw new BadRequestException('Seçilen kişilerin hepsine bu anket daha önce gitti.');
      }
    }
    await this.campaigns.confirm(created.id, { id: actor.id, role: actor.role, companyId });
    await this.dataSource.query(
      `INSERT INTO survey_campaigns (survey_id, campaign_id, kind) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [survey.id, created.id, kind],
    );
    survey.originatorId = dto.originatorId;
    survey.smsBody = body;
    if (kind === 'SEND') survey.audience = { sources: requested };
    await this.dataSource.getRepository(Survey).save(survey);
    await this.audit.log(kind === 'REMINDER' ? 'SURVEY_REMIND' : 'SURVEY_SEND', 'Survey', survey.id, actor.id, companyId, null, {
      campaignId: created.id,
      recipients: Math.max(0, created.validRecipientCount - skippedCount),
      skipped: skippedCount,
    });
    return {
      campaignId: created.id,
      validRecipientCount: Math.max(0, created.validRecipientCount - skippedCount),
      skippedCount,
    };
  }

  private async skipAlreadySent(campaignId: string, surveyId: string) {
    const [row] = await this.dataSource.query(
      `WITH skipped AS (
         UPDATE sms_campaign_recipients r
         SET status = 'EXCLUDED', exclude_reason = 'ALREADY_SENT'
         WHERE r.campaign_id = $1
           AND r.status IN ('INCLUDED', 'QUEUED')
           AND EXISTS (
             SELECT 1
             FROM survey_campaigns sc
             JOIN sms_campaign_recipients prev ON prev.campaign_id = sc.campaign_id
             WHERE sc.survey_id = $2
               AND sc.campaign_id <> $1
               AND prev.mobile_normalized = r.mobile_normalized
               AND prev.status IN ('QUEUED', 'PROCESSING', 'ACCEPTED', 'SENT', 'DELIVERED')
           )
         RETURNING 1
       )
       SELECT COUNT(*)::int AS skipped FROM skipped`,
      [campaignId, surveyId],
    );
    return Number(row?.skipped) || 0;
  }

  async qr(companyId: string, id: string) {
    const survey = await this.surveys.requireOwned(companyId, id);
    if (!survey.publicSlug) throw new BadRequestException('QR için anketi önce yayınlayın');
    return { url: `${this.origin()}/s/${survey.publicSlug}?src=qr` };
  }

  private messageBody(survey: Survey, body: string) {
    let text = body.trim();
    if (survey.personalized) {
      if (!text.includes('{survey_link}')) text = `${text} {survey_link}`.trim();
      return text;
    }
    const link = survey.publicSlug ? `${this.origin()}/s/${survey.publicSlug}` : '{survey_link}';
    if (!text.includes(link) && !text.includes('{survey_link}')) text = `${text} ${link}`.trim();
    return text.replaceAll('{survey_link}', link);
  }

  private async reminderSources(surveyId: string) {
    const rows: { normalized_phone: string }[] = await this.dataSource.query(
      `SELECT normalized_phone FROM survey_recipients
       WHERE survey_id = $1 AND completed_at IS NULL AND normalized_phone IS NOT NULL`,
      [surveyId],
    );
    if (!rows.length) return [];
    return [{ type: 'MANUAL' as const, label: 'Hatırlatma', phones: rows.map((row) => row.normalized_phone) }];
  }
}
