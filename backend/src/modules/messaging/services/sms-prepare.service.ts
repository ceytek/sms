import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Contact } from '../../contacts/entities/contact.entity.js';
import { ContactGroupMember } from '../../contacts/entities/contact-group-member.entity.js';
import { ContactTagMember } from '../../contacts/entities/contact-tag-member.entity.js';
import { ContactStatus } from '../../../common/enums/contact-status.enum.js';
import { Company } from '../../companies/entities/company.entity.js';
import { CompanyStatus } from '../../../common/enums/company-status.enum.js';
import { Role } from '../../../common/enums/role.enum.js';
import { KvkkConsent } from '../../kvkk/entities/kvkk-consent.entity.js';
import { KvkkConsentStatus } from '../../../common/enums/kvkk-consent-status.enum.js';
import { OriginatorBlockedNumber } from '../../originator-restrictions/entities/originator-blocked-number.entity.js';
import { OriginatorRestrictionType } from '../../../common/enums/originator-restriction-type.enum.js';
import { SmsCampaign } from '../entities/sms-campaign.entity.js';
import { SmsCampaignRecipient } from '../entities/sms-campaign-recipient.entity.js';
import { SmsCampaignSource } from '../entities/sms-campaign-source.entity.js';
import { SmsCampaignStatus } from '../../../common/enums/sms-campaign-status.enum.js';
import { SmsCampaignSourceType } from '../../../common/enums/sms-campaign-source-type.enum.js';
import { SmsExcludeReason } from '../../../common/enums/sms-exclude-reason.enum.js';
import { SmsRecipientStatus } from '../../../common/enums/sms-recipient-status.enum.js';
import { formatTrMobile, normalizeTrMobile } from '../../../common/phone/normalize-tr-mobile.js';
import { ContactCustomField } from '../../contacts/entities/contact-custom-field.entity.js';
import { ContactCustomFieldType } from '../../../common/enums/contact-custom-field-type.enum.js';
import { customTokenKey, hasPersonalization, renderSmsTemplate, smsEncodingAndParts } from '../sms-text.js';
import { extractPhonesFromSpreadsheetBuffer } from '../sms-file-phones.js';
import { CampaignStateService } from './campaign-state.service.js';
import { readFile } from 'fs/promises';

type Incoming = {
  raw: string;
  sourceType: string;
  contactId?: string;
  companyId?: string;
  subcategoryId?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  contactStatus?: ContactStatus;
  customFields?: Record<string, string>;
};

const CHUNK = 400;

@Injectable()
export class SmsPrepareService {
  private readonly logger = new Logger(SmsPrepareService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly state: CampaignStateService,
  ) {}

  async prepare(campaignId: string) {
    const campaignRepo = this.dataSource.getRepository(SmsCampaign);
    const campaign = await campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Kampanya bulunamadı');
    if (campaign.status === SmsCampaignStatus.CANCELLED) return campaign;
    if (
      campaign.preparedAt &&
      campaign.status !== SmsCampaignStatus.PREPARING &&
      campaign.status !== SmsCampaignStatus.DRAFT
    ) {
      return campaign;
    }

    await this.state.markCampaign(
      campaign.id,
      [SmsCampaignStatus.DRAFT, SmsCampaignStatus.QUEUED, SmsCampaignStatus.SCHEDULED, SmsCampaignStatus.PREPARING],
      SmsCampaignStatus.PREPARING,
    );

    await this.dataSource.getRepository(SmsCampaignRecipient).delete({ campaignId: campaign.id });

    const sources = await this.dataSource.getRepository(SmsCampaignSource).find({
      where: { campaignId: campaign.id },
    });
    for (const source of sources) {
      source.rawCount = 0;
    }
    if (sources.length) {
      await this.dataSource.getRepository(SmsCampaignSource).save(sources);
    }
    const seen = new Set<string>();
    const customFieldDefs = await this.dataSource.getRepository(ContactCustomField).find({
      where: { ownerCompanyId: campaign.senderCompanyId, isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const personalized = hasPersonalization(
      campaign.body,
      customFieldDefs.map((field) => field.name),
    );

    for (const source of sources) {
      for await (const incoming of this.iterateSource(campaign, source)) {
        await this.ingestChunk(campaign, source, incoming, seen, personalized, customFieldDefs);
      }
    }

    await this.excludeRestrictedSendables(campaign);
    await this.attachSurveyLinks(campaign);
    await this.attachFormLinks(campaign);
    await this.state.reconcileCampaign(campaign.id);
    const ready = await this.state.markCampaign(
      campaign.id,
      [SmsCampaignStatus.PREPARING, SmsCampaignStatus.DRAFT, SmsCampaignStatus.QUEUED],
      SmsCampaignStatus.READY,
      { preparedAt: new Date() },
    );
    this.logger.log(`Prepared campaign ${campaign.id}`);
    return ready ?? (await campaignRepo.findOneByOrFail({ id: campaign.id }));
  }

  private async attachSurveyLinks(campaign: SmsCampaign) {
    if (!campaign.surveyId) return;
    await this.dataSource.query(
      `INSERT INTO survey_recipients (
         survey_id, company_id, contact_id, normalized_phone, display_name, token,
         invite_status, sms_campaign_id, sms_recipient_id, created_at, updated_at
       )
       SELECT
         $2, $3, r.contact_id, r.mobile_normalized, NULLIF(r.display_name, ''),
         left(translate(encode(decode(md5(r.id::text || uuid_generate_v4()::text), 'hex'), 'base64'), '+/=', '-_'), 22),
         'NOT_SENT', $1, r.id, now(), now()
       FROM sms_campaign_recipients r
       WHERE r.campaign_id = $1
         AND r.status IN ('INCLUDED', 'QUEUED')
         AND r.mobile_normalized IS NOT NULL
         AND EXISTS (SELECT 1 FROM surveys s WHERE s.id = $2 AND s.company_id = $3)
       ON CONFLICT (survey_id, normalized_phone) DO UPDATE SET
         sms_campaign_id = EXCLUDED.sms_campaign_id,
         sms_recipient_id = EXCLUDED.sms_recipient_id,
         contact_id = COALESCE(survey_recipients.contact_id, EXCLUDED.contact_id),
         display_name = COALESCE(survey_recipients.display_name, EXCLUDED.display_name),
         updated_at = now()`,
      [campaign.id, campaign.surveyId, campaign.senderCompanyId],
    );
    if (!/\{survey_link\}/i.test(campaign.body)) return;
    const origin = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    let lastId = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: { id: string; rendered_body: string; token: string }[] = await this.dataSource.query(
        `SELECT r.id, COALESCE(r.rendered_body, '') AS rendered_body, sr.token
         FROM sms_campaign_recipients r
         JOIN survey_recipients sr ON sr.survey_id = $2 AND sr.normalized_phone = r.mobile_normalized
         WHERE r.campaign_id = $1 AND r.id > $3 AND r.status IN ('INCLUDED', 'QUEUED')
         ORDER BY r.id
         LIMIT 400`,
        [campaign.id, campaign.surveyId, lastId],
      );
      if (!rows.length) break;
      const values: string[] = [];
      const params: unknown[] = [];
      rows.forEach((row, index) => {
        const body = String(row.rendered_body || campaign.body).replace(/\{survey_link\}/gi, `${origin}/r/${row.token}`);
        const meta = smsEncodingAndParts(body);
        const base = index * 4;
        values.push(`($${base + 1}::uuid, $${base + 2}, $${base + 3}, $${base + 4}::int)`);
        params.push(row.id, body, meta.encoding, meta.parts);
      });
      await this.dataSource.query(
        `UPDATE sms_campaign_recipients AS r
         SET rendered_body = v.body, encoding = v.encoding, sms_parts = v.parts
         FROM (VALUES ${values.join(',')}) AS v(id, body, encoding, parts)
         WHERE r.id = v.id`,
        params,
      );
      lastId = rows[rows.length - 1].id;
      if (rows.length < 400) break;
    }
  }

  private async attachFormLinks(campaign: SmsCampaign) {
    if (!campaign.formId || !/\{form_link\}/i.test(campaign.body)) return;
    const [form] = await this.dataSource.query(
      `SELECT personalized, public_slug FROM forms WHERE id = $1 AND company_id = $2`,
      [campaign.formId, campaign.senderCompanyId],
    );
    if (!form) return;
    const origin = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    if (!form.personalized) {
      if (!form.public_slug) return;
      const link = `${origin}/f/${form.public_slug}`;
      await this.dataSource.query(
        `UPDATE sms_campaign_recipients
         SET rendered_body = replace(COALESCE(NULLIF(rendered_body, ''), $2), '{form_link}', $3)
         WHERE campaign_id = $1 AND status IN ('INCLUDED', 'QUEUED')`,
        [campaign.id, campaign.body, link],
      );
      return;
    }
    await this.dataSource.query(
      `INSERT INTO form_recipients (
         form_id, company_id, name, phone, normalized_phone, token, invite_status, sms_recipient_id, created_at
       )
       SELECT
         $2, $3, NULLIF(r.display_name, ''), r.mobile_normalized, r.mobile_normalized,
         left(translate(encode(decode(md5(r.id::text || uuid_generate_v4()::text), 'hex'), 'base64'), '+/=', '-_'), 22),
         'PENDING', r.id, now()
       FROM sms_campaign_recipients r
       WHERE r.campaign_id = $1
         AND r.status IN ('INCLUDED', 'QUEUED')
         AND r.mobile_normalized IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM form_recipients fr
           WHERE fr.form_id = $2 AND fr.normalized_phone = r.mobile_normalized
         )`,
      [campaign.id, campaign.formId, campaign.senderCompanyId],
    );
    let lastId = '00000000-0000-0000-0000-000000000000';
    for (;;) {
      const rows: { id: string; rendered_body: string; token: string }[] = await this.dataSource.query(
        `SELECT r.id, COALESCE(r.rendered_body, '') AS rendered_body, fr.token
         FROM sms_campaign_recipients r
         JOIN form_recipients fr ON fr.form_id = $2 AND fr.normalized_phone = r.mobile_normalized
         WHERE r.campaign_id = $1 AND r.id > $3 AND r.status IN ('INCLUDED', 'QUEUED')
         ORDER BY r.id
         LIMIT 400`,
        [campaign.id, campaign.formId, lastId],
      );
      if (!rows.length) break;
      const values: string[] = [];
      const params: unknown[] = [];
      rows.forEach((row, index) => {
        const body = String(row.rendered_body || campaign.body).replace(/\{form_link\}/gi, `${origin}/fr/${row.token}`);
        const meta = smsEncodingAndParts(body);
        const base = index * 4;
        values.push(`($${base + 1}::uuid, $${base + 2}, $${base + 3}, $${base + 4}::int)`);
        params.push(row.id, body, meta.encoding, meta.parts);
      });
      await this.dataSource.query(
        `UPDATE sms_campaign_recipients AS r
         SET rendered_body = v.body, encoding = v.encoding, sms_parts = v.parts
         FROM (VALUES ${values.join(',')}) AS v(id, body, encoding, parts)
         WHERE r.id = v.id`,
        params,
      );
      lastId = rows[rows.length - 1].id;
      if (rows.length < 400) break;
    }
  }

  private async *iterateSource(campaign: SmsCampaign, source: SmsCampaignSource): AsyncGenerator<Incoming[]> {
    const payload = source.payload ?? {};
    if (source.sourceType === SmsCampaignSourceType.MANUAL) {
      const phones = Array.isArray(payload.phones) ? payload.phones.map(String) : [];
      yield phones.map((raw) => ({ raw, sourceType: source.sourceType }));
      return;
    }
    if (source.sourceType === SmsCampaignSourceType.FILE) {
      yield* this.iterateFile(campaign, source);
      return;
    }
    if (source.sourceType === SmsCampaignSourceType.CUSTOMER_CATEGORY && source.subcategoryId) {
      yield* this.iterateCompanies(campaign, source);
      return;
    }
    if (source.sourceType === SmsCampaignSourceType.CONTACT_GROUP && !source.groupId) return;
    if (source.sourceType === SmsCampaignSourceType.TAG && !source.tagId) return;
    if (source.sourceType === SmsCampaignSourceType.CONTACT_PICK) {
      const picked = Array.isArray(payload.contactIds) ? payload.contactIds : [];
      if (!picked.length) return;
    }
    yield* this.iterateContacts(campaign, source);
  }

  private async *iterateContacts(campaign: SmsCampaign, source: SmsCampaignSource): AsyncGenerator<Incoming[]> {
    const payload = source.payload ?? {};
    const excluded = new Set(
      Array.isArray(payload.excludedContactIds) ? payload.excludedContactIds.map(String) : [],
    );
    const picked = Array.isArray(payload.contactIds) ? payload.contactIds.map(String) : [];
    let lastId = '';
    for (;;) {
      const qb = this.dataSource
        .getRepository(Contact)
        .createQueryBuilder('contact')
        .where('contact.ownerCompanyId = :owner', { owner: campaign.senderCompanyId })
        .andWhere('contact.deletedAt IS NULL')
        .orderBy('contact.id', 'ASC')
        .take(CHUNK);
      if (lastId) qb.andWhere('contact.id > :lastId', { lastId });
      if (source.sourceType === SmsCampaignSourceType.CONTACT_GROUP && source.groupId) {
        qb.innerJoin(ContactGroupMember, 'member', 'member.contactId = contact.id AND member.groupId = :groupId', {
          groupId: source.groupId,
        });
      }
      if (source.sourceType === SmsCampaignSourceType.TAG && source.tagId) {
        qb.innerJoin(ContactTagMember, 'tag', 'tag.contactId = contact.id AND tag.tagId = :tagId', {
          tagId: source.tagId,
        });
      }
      if (source.sourceType === SmsCampaignSourceType.CONTACT_PICK && picked.length) {
        qb.andWhere('contact.id IN (:...picked)', { picked });
      }
      const rows = await qb.getMany();
      if (!rows.length) break;
      lastId = rows[rows.length - 1].id;
      yield rows
        .filter((row) => !excluded.has(row.id))
        .map((row) => ({
          raw: row.mobilePhone,
          sourceType: source.sourceType,
          contactId: row.id,
          firstName: row.firstName,
          lastName: row.lastName,
          companyName: row.companyName,
          email: row.email,
          contactStatus: row.status,
          customFields: row.customFields,
        }));
      if (rows.length < CHUNK) break;
    }
  }

  private async *iterateCompanies(campaign: SmsCampaign, source: SmsCampaignSource): AsyncGenerator<Incoming[]> {
    const payload = source.payload ?? {};
    const excluded = new Set(
      Array.isArray(payload.excludedCompanyIds) ? payload.excludedCompanyIds.map(String) : [],
    );
    const qbBase = this.dataSource
      .getRepository(Company)
      .createQueryBuilder('company')
      .where('company.deletedAt IS NULL')
      .andWhere('company.status = :status', { status: CompanyStatus.ACTIVE })
      .andWhere('company.isDealer = false')
      .andWhere('company.subcategoryId = :subId', { subId: source.subcategoryId });

    const actorRole = String(payload.actorRole ?? '');
    if (actorRole === Role.DEALER) {
      qbBase.andWhere('company.dealerCompanyId = :dealerId', { dealerId: campaign.senderCompanyId });
    } else if (actorRole === Role.ADMIN) {
      qbBase.andWhere('company.dealerCompanyId IS NULL');
    }

    let lastId = '';
    for (;;) {
      const qb = qbBase.clone().orderBy('company.id', 'ASC').take(CHUNK);
      if (lastId) qb.andWhere('company.id > :lastId', { lastId });
      const rows = await qb.getMany();
      if (!rows.length) break;
      lastId = rows[rows.length - 1].id;
      yield rows
        .filter((row) => !excluded.has(row.id))
        .map((row) => ({
          raw: row.mobile ?? '',
          sourceType: source.sourceType,
          companyId: row.id,
          subcategoryId: source.subcategoryId,
          companyName: row.name,
        }));
      if (rows.length < CHUNK) break;
    }
  }

  private async *iterateFile(campaign: SmsCampaign, source: SmsCampaignSource): AsyncGenerator<Incoming[]> {
    const payload = source.payload ?? {};
    if (Array.isArray(payload.phones) && payload.phones.length) {
      const phones = payload.phones.map(String);
      for (let i = 0; i < phones.length; i += CHUNK) {
        yield phones.slice(i, i + CHUNK).map((raw) => ({ raw, sourceType: source.sourceType }));
      }
      return;
    }
    if (!campaign.filePath) return;
    const buf = await readFile(campaign.filePath);
    const phones = extractPhonesFromSpreadsheetBuffer(buf);
    for (let i = 0; i < phones.length; i += CHUNK) {
      yield phones.slice(i, i + CHUNK).map((raw) => ({ raw, sourceType: source.sourceType }));
    }
  }

  private async ingestChunk(
    campaign: SmsCampaign,
    source: SmsCampaignSource,
    incoming: Incoming[],
    seen: Set<string>,
    personalized: boolean,
    customFieldDefs: ContactCustomField[] = [],
  ) {
    if (!incoming.length) return;
    const normalizedList = incoming
      .map((item) => normalizeTrMobile(item.raw))
      .filter((item): item is string => Boolean(item));

    const [restrictionMap, approved] = await Promise.all([
      this.loadRestrictionMap(campaign.senderCompanyId, campaign.originatorId, normalizedList),
      campaign.kvkkCheckEnabled && normalizedList.length
        ? this.dataSource.getRepository(KvkkConsent).find({
            where: {
              ownerCompanyId: campaign.senderCompanyId,
              normalizedPhone: In(normalizedList),
              status: KvkkConsentStatus.APPROVED,
            },
          })
        : Promise.resolve([]),
    ]);
    const approvedSet = new Set(approved.map((row) => row.normalizedPhone));
    const book = normalizedList.length
      ? await this.dataSource.getRepository(Contact).find({
          where: { ownerCompanyId: campaign.senderCompanyId, normalizedPhone: In(normalizedList) },
          select: ['id', 'normalizedPhone', 'firstName', 'lastName', 'companyName', 'status', 'customFields'],
        })
      : [];
    const contactByPhone = new Map(book.map((row) => [row.normalizedPhone, row]));

    const entities: SmsCampaignRecipient[] = [];
    for (const item of incoming) {
      const normalized = normalizeTrMobile(item.raw);
      const found = normalized ? contactByPhone.get(normalized) : undefined;
      const linked: Incoming = found
        ? {
            ...item,
            contactId: item.contactId || found.id,
            firstName: item.firstName || found.firstName,
            lastName: item.lastName || found.lastName,
            companyName: item.companyName || found.companyName,
            contactStatus: item.contactStatus ?? found.status,
            customFields: item.customFields ?? found.customFields,
          }
        : item;
      const classified = this.classify(
        campaign,
        linked,
        seen,
        restrictionMap,
        approvedSet,
        personalized,
        customFieldDefs,
      );
      entities.push(
        this.dataSource.getRepository(SmsCampaignRecipient).create({
          campaignId: campaign.id,
          ...classified,
        }),
      );
    }
    const saved = await this.dataSource.getRepository(SmsCampaignRecipient).save(entities);
    for (const row of saved) {
      if (row.status !== SmsRecipientStatus.INCLUDED || row.clientReference) continue;
      row.clientReference = `sms.${campaign.id}.${row.id}`;
    }
    await this.dataSource.getRepository(SmsCampaignRecipient).save(
      saved.filter((row) => row.status === SmsRecipientStatus.INCLUDED),
    );
    source.rawCount += incoming.length;
    await this.dataSource.getRepository(SmsCampaignSource).save(source);
  }

  async findRestrictedPhones(ownerCompanyId: string, originatorId: string | undefined, phones: string[]) {
    const normalizedList = [
      ...new Set(phones.map((phone) => normalizeTrMobile(phone)).filter((phone): phone is string => Boolean(phone))),
    ];
    const restrictionMap = await this.loadRestrictionMap(ownerCompanyId, originatorId, normalizedList);
    const blacklist: string[] = [];
    const smsBlocked: string[] = [];
    for (const [phone, reason] of restrictionMap) {
      const formatted = formatTrMobile(phone) || phone;
      if (reason === 'BLACKLIST') blacklist.push(formatted);
      else smsBlocked.push(formatted);
    }
    return { blacklist, smsBlocked, total: blacklist.length + smsBlocked.length };
  }

  private async loadRestrictionMap(
    ownerCompanyId: string,
    _originatorId: string | undefined,
    normalizedList: string[],
  ) {
    const map = new Map<string, 'BLACKLIST' | 'SMS_BLOCKED'>();
    if (!normalizedList.length) return map;

    const [blocked, contacts] = await Promise.all([
      this.dataSource.getRepository(OriginatorBlockedNumber).find({
        where: { ownerCompanyId, normalizedPhone: In(normalizedList) },
      }),
      this.dataSource.getRepository(Contact).find({
        where: {
          ownerCompanyId,
          normalizedPhone: In(normalizedList),
          status: In([ContactStatus.BLACKLIST, ContactStatus.SMS_BLOCKED]),
        },
        select: ['id', 'normalizedPhone', 'status'],
      }),
    ]);

    const apply = (phone: string, reason: 'BLACKLIST' | 'SMS_BLOCKED') => {
      if (map.get(phone) === 'BLACKLIST') return;
      map.set(phone, reason);
    };
    for (const row of contacts) {
      apply(row.normalizedPhone, row.status === ContactStatus.BLACKLIST ? 'BLACKLIST' : 'SMS_BLOCKED');
    }
    for (const row of blocked) {
      apply(
        row.normalizedPhone,
        row.restrictionType === OriginatorRestrictionType.BLACKLIST ? 'BLACKLIST' : 'SMS_BLOCKED',
      );
    }
    return map;
  }

  private async excludeRestrictedSendables(campaign: SmsCampaign) {
    await this.dataSource.query(
      `UPDATE sms_campaign_recipients r
       SET status = 'EXCLUDED', exclude_reason = 'BLACKLIST'
       FROM originator_blocked_numbers o
       WHERE r.campaign_id = $1
         AND r.status IN ('INCLUDED', 'QUEUED')
         AND o.owner_company_id = $2
         AND o.deleted_at IS NULL
         AND o.normalized_phone = r.mobile_normalized
         AND o.restriction_type = 'BLACKLIST'`,
      [campaign.id, campaign.senderCompanyId],
    );
    await this.dataSource.query(
      `UPDATE sms_campaign_recipients r
       SET status = 'EXCLUDED', exclude_reason = 'BLACKLIST'
       FROM contacts c
       WHERE r.campaign_id = $1
         AND r.status IN ('INCLUDED', 'QUEUED')
         AND c.owner_company_id = $2
         AND c.deleted_at IS NULL
         AND c.normalized_phone = r.mobile_normalized
         AND c.status = 'BLACKLIST'`,
      [campaign.id, campaign.senderCompanyId],
    );
    await this.dataSource.query(
      `UPDATE sms_campaign_recipients r
       SET status = 'EXCLUDED', exclude_reason = 'SMS_BLOCKED'
       FROM originator_blocked_numbers o
       WHERE r.campaign_id = $1
         AND r.status IN ('INCLUDED', 'QUEUED')
         AND o.owner_company_id = $2
         AND o.deleted_at IS NULL
         AND o.normalized_phone = r.mobile_normalized
         AND o.restriction_type = 'SMS_BLOCKED'`,
      [campaign.id, campaign.senderCompanyId],
    );
    await this.dataSource.query(
      `UPDATE sms_campaign_recipients r
       SET status = 'EXCLUDED', exclude_reason = 'SMS_BLOCKED'
       FROM contacts c
       WHERE r.campaign_id = $1
         AND r.status IN ('INCLUDED', 'QUEUED')
         AND c.owner_company_id = $2
         AND c.deleted_at IS NULL
         AND c.normalized_phone = r.mobile_normalized
         AND c.status = 'SMS_BLOCKED'`,
      [campaign.id, campaign.senderCompanyId],
    );
  }

  private classify(
    campaign: SmsCampaign,
    item: Incoming,
    seen: Set<string>,
    restrictionMap: Map<string, 'BLACKLIST' | 'SMS_BLOCKED'>,
    approvedSet: Set<string>,
    personalized: boolean,
    customFieldDefs: ContactCustomField[] = [],
  ): Partial<SmsCampaignRecipient> {
    const raw = item.raw?.trim() || '';
    const normalized = normalizeTrMobile(raw);
    const rendered = personalized
      ? renderSmsTemplate(campaign.body, {
          firstName: item.firstName,
          lastName: item.lastName,
          companyName: item.companyName,
          phone: normalized ?? raw,
          email: item.email,
          custom: customValues(customFieldDefs, item.customFields),
        })
      : campaign.body;
    const { encoding, parts } = smsEncodingAndParts(rendered);
    const base: Partial<SmsCampaignRecipient> = {
      mobileRaw: raw || undefined,
      mobileNormalized: normalized ?? undefined,
      sourceType: item.sourceType,
      contactId: item.contactId,
      companyId: item.companyId,
      subcategoryId: item.subcategoryId,
      firstName: item.firstName,
      lastName: item.lastName,
      companyName: item.companyName,
      displayName: [item.firstName, item.lastName].filter(Boolean).join(' ') || item.companyName,
      renderedBody: rendered,
      encoding,
      smsParts: parts,
    };

    if (!raw) {
      return { ...base, status: SmsRecipientStatus.INVALID, excludeReason: SmsExcludeReason.MISSING_MOBILE };
    }
    if (!normalized) {
      return { ...base, status: SmsRecipientStatus.INVALID, excludeReason: SmsExcludeReason.INVALID_MOBILE };
    }
    if (item.contactStatus === ContactStatus.PASSIVE) {
      return { ...base, status: SmsRecipientStatus.EXCLUDED, excludeReason: SmsExcludeReason.PASSIVE };
    }
    const restriction = restrictionMap.get(normalized);
    if (item.contactStatus === ContactStatus.BLACKLIST || restriction === 'BLACKLIST') {
      return { ...base, status: SmsRecipientStatus.EXCLUDED, excludeReason: SmsExcludeReason.BLACKLIST };
    }
    if (item.contactStatus === ContactStatus.SMS_BLOCKED || restriction === 'SMS_BLOCKED') {
      return { ...base, status: SmsRecipientStatus.EXCLUDED, excludeReason: SmsExcludeReason.SMS_BLOCKED };
    }
    if (campaign.kvkkCheckEnabled && !approvedSet.has(normalized)) {
      return {
        ...base,
        status: SmsRecipientStatus.EXCLUDED,
        excludeReason: SmsExcludeReason.NO_CONSENT,
        consentStatus: 'MISSING',
      };
    }
    if (seen.has(normalized)) {
      return { ...base, status: SmsRecipientStatus.DUPLICATE, excludeReason: SmsExcludeReason.DUPLICATE_MOBILE };
    }
    seen.add(normalized);
    return { ...base, status: SmsRecipientStatus.INCLUDED };
  }
}

function customValues(fields: ContactCustomField[], values?: Record<string, string>) {
  const mapped: Record<string, string> = {};
  for (const field of fields) {
    mapped[customTokenKey(field.name)] = displayCustomValue(field, values?.[field.id]);
  }
  return mapped;
}

function displayCustomValue(field: ContactCustomField, raw?: string) {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (field.fieldType === ContactCustomFieldType.DATE && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-');
    return `${day}.${month}.${year}`;
  }
  return value;
}
