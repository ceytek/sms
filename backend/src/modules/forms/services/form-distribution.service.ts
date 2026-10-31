import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { DataSource } from 'typeorm';
import { AuditService } from '../../audit/audit.service.js';
import { SmsCampaignService } from '../../messaging/services/sms-campaign.service.js';
import { DistributeFormDto } from '../dto/form.dto.js';
import { Form } from '../entities/form.entity.js';
import type { FormActor } from './form-access.service.js';
import { FormService } from './form.service.js';

@Injectable()
export class FormDistributionService {
  constructor(
    private readonly forms: FormService,
    private readonly campaigns: SmsCampaignService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  origin() {
    return (this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(/\/$/, '');
  }

  async distribute(actor: FormActor, companyId: string, id: string, dto: DistributeFormDto) {
    const form = await this.forms.requireOwned(companyId, id);
    if (form.status !== 'ACTIVE') throw new BadRequestException('SMS yalnızca yayındaki forma gönderilir');
    const requested = dto.sources ?? [];
    if (!requested.length) throw new BadRequestException('Alıcı seçin');
    const body = this.messageBody(form, dto.body);
    const idempotencyKey = `form-${id.slice(0, 8)}-${randomBytes(6).toString('hex')}`;
    const created = await this.campaigns.create(
      {
        idempotencyKey,
        name: form.name.slice(0, 120),
        category: 'BILGILENDIRME',
        composition: form.personalized || body.includes('{form_link}') ? 'PERSONALIZED' : 'BULK',
        originatorId: dto.originatorId,
        body,
        mode: 'SEND',
        formId: form.id,
        sources: requested as never,
      },
      { id: actor.id, role: actor.role, companyId },
    );
    if (!created.validRecipientCount) {
      throw new BadRequestException('Gönderilebilir numara yok. Yasaklı ve geçersiz numaralar elendi.');
    }
    await this.campaigns.confirm(created.id, { id: actor.id, role: actor.role, companyId });
    await this.dataSource.query(
      `INSERT INTO form_campaigns (form_id, campaign_id, kind) VALUES ($1, $2, 'SEND') ON CONFLICT DO NOTHING`,
      [form.id, created.id],
    );
    form.originatorId = dto.originatorId;
    form.smsBody = body;
    form.audience = { sources: requested };
    await this.dataSource.getRepository(Form).save(form);
    await this.audit.log('FORM_SEND', 'Form', form.id, actor.id, companyId, null, {
      campaignId: created.id,
      recipients: created.validRecipientCount,
    });
    return { campaignId: created.id, validRecipientCount: created.validRecipientCount };
  }

  async qr(companyId: string, id: string) {
    const form = await this.forms.requireOwned(companyId, id);
    if (!form.publicSlug) throw new BadRequestException('QR için formu önce yayınlayın');
    return { url: `${this.origin()}/f/${form.publicSlug}?src=qr` };
  }

  private messageBody(form: Form, body: string) {
    let text = body.trim();
    if (form.personalized) {
      if (!text.includes('{form_link}')) text = `${text} {form_link}`.trim();
      return text;
    }
    const link = form.publicSlug ? `${this.origin()}/f/${form.publicSlug}` : '{form_link}';
    if (!text.includes(link) && !text.includes('{form_link}')) text = `${text} ${link}`.trim();
    return text.replaceAll('{form_link}', link);
  }
}
