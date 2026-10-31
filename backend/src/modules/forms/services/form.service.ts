import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, IsNull, Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service.js';
import { Company } from '../../companies/entities/company.entity.js';
import { CreateFormTemplateDto, SaveFieldsDto, UpsertFormDto } from '../dto/form.dto.js';
import { FormField } from '../entities/form-field.entity.js';
import { FormSubmission } from '../entities/form-submission.entity.js';
import { FormTemplate, type FormTemplateField } from '../entities/form-template.entity.js';
import { Form } from '../entities/form.entity.js';
import { slugifyFormName } from '../form.constants.js';
import type { FormActor } from './form-access.service.js';

const DEFAULT_SMS = 'Formumuzu doldurmak için: {form_link}';
const DEFAULT_THANKS = 'Teşekkür ederiz. Bilgileriniz başarıyla kaydedildi.';

@Injectable()
export class FormService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    @InjectRepository(Form) private readonly forms: Repository<Form>,
    @InjectRepository(FormField) private readonly fields: Repository<FormField>,
    @InjectRepository(FormSubmission) private readonly submissions: Repository<FormSubmission>,
    @InjectRepository(FormTemplate) private readonly templates: Repository<FormTemplate>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
  ) {}

  async refreshCompany(companyId: string) {
    await this.dataSource.query(
      `UPDATE forms SET status = 'EXPIRED', updated_at = now()
       WHERE company_id = $1 AND status = 'ACTIVE' AND ends_at IS NOT NULL AND ends_at <= now()`,
      [companyId],
    );
  }

  async list(companyId: string) {
    await this.refreshCompany(companyId);
    const rows = await this.forms.find({ where: { companyId }, order: { updatedAt: 'DESC' }, take: 200 });
    const stats = await this.submissionStats(rows.map((r) => r.id));
    return rows.map((r) => this.toListItem(r, stats.get(r.id)));
  }

  async get(companyId: string, id: string) {
    await this.refreshCompany(companyId);
    const form = await this.requireOwned(companyId, id);
    const fields = await this.fields.find({ where: { formId: id }, order: { position: 'ASC' } });
    const branding = await this.branding(form);
    return {
      ...this.toListItem(form),
      ...branding,
      fields: fields.map((f) => ({
        id: f.id,
        type: f.type,
        label: f.label,
        description: f.description ?? '',
        placeholder: f.placeholder ?? '',
        required: f.required,
        defaultValue: f.defaultValue ?? '',
        position: f.position,
        validation: f.validation ?? null,
        options: f.options ?? [],
      })),
    };
  }

  async create(actor: FormActor, companyId: string, dto: UpsertFormDto) {
    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Form adı zorunludur');
    const form = await this.forms.save(
      this.forms.create({
        companyId,
        name,
        title: dto.title?.trim() || name,
        description: dto.description?.trim() || undefined,
        thankYouMessage: dto.thankYouMessage?.trim() || DEFAULT_THANKS,
        smsBody: dto.smsBody?.trim() || DEFAULT_SMS,
        personalized: dto.personalized ?? false,
        singleSubmission: dto.singleSubmission ?? false,
        allowEdit: dto.allowEdit ?? false,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        maxSubmissions: dto.maxSubmissions,
        createdBy: actor.id,
        status: 'DRAFT',
      }),
    );
    await this.audit.log('FORM_CREATE', 'Form', form.id, actor.id, companyId, null, { name: form.name });
    return this.get(companyId, form.id);
  }

  async update(actor: FormActor, companyId: string, id: string, dto: UpsertFormDto) {
    const form = await this.requireOwned(companyId, id);
    if (form.status === 'ARCHIVED') throw new BadRequestException('Arşivlenmiş formda düzenleme yapılamaz');
    if (dto.name !== undefined) form.name = dto.name.trim();
    if (dto.title !== undefined) form.title = dto.title.trim();
    if (dto.description !== undefined) form.description = dto.description.trim() || undefined;
    if (dto.logoUrl !== undefined) form.logoUrl = dto.logoUrl || undefined;
    if (dto.companyNameOverride !== undefined) form.companyNameOverride = dto.companyNameOverride || undefined;
    if (dto.thankYouMessage !== undefined) form.thankYouMessage = dto.thankYouMessage.trim() || undefined;
    if (dto.personalized !== undefined) form.personalized = dto.personalized;
    if (dto.singleSubmission !== undefined) form.singleSubmission = dto.singleSubmission;
    if (dto.allowEdit !== undefined) form.allowEdit = dto.allowEdit;
    if (dto.startsAt !== undefined) form.startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined;
    if (dto.endsAt !== undefined) form.endsAt = dto.endsAt ? new Date(dto.endsAt) : undefined;
    if (dto.maxSubmissions !== undefined) form.maxSubmissions = dto.maxSubmissions;
    if (dto.smsBody !== undefined) form.smsBody = dto.smsBody.trim();
    if (dto.originatorId !== undefined) form.originatorId = dto.originatorId;
    if (dto.audience !== undefined) form.audience = dto.audience;
    await this.forms.save(form);
    await this.audit.log('FORM_UPDATE', 'Form', form.id, actor.id, companyId, null, { name: form.name });
    return this.get(companyId, id);
  }

  async saveFields(actor: FormActor, companyId: string, id: string, dto: SaveFieldsDto) {
    const form = await this.requireOwned(companyId, id);
    if (form.status === 'ARCHIVED') throw new BadRequestException('Arşivlenmiş formda alan düzenlenemez');
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(FormField, { formId: id });
      if (dto.fields.length) {
        const entities = dto.fields.map((f, i) =>
          manager.create(FormField, {
            formId: id,
            type: f.type,
            label: f.label.trim(),
            description: f.description?.trim() || undefined,
            placeholder: f.placeholder?.trim() || undefined,
            required: f.required,
            defaultValue: f.defaultValue?.trim() || undefined,
            position: f.position ?? i,
            validation: f.validation ?? undefined,
            options: f.options ?? undefined,
          }),
        );
        await manager.save(entities);
      }
    });
    await this.audit.log('FORM_UPDATE', 'Form', id, actor.id, companyId, null, { fields: dto.fields.length });
    return this.get(companyId, id);
  }

  async publish(actor: FormActor, companyId: string, id: string) {
    const form = await this.requireOwned(companyId, id);
    if (form.status === 'ARCHIVED') throw new BadRequestException('Arşivlenmiş form yayınlanamaz');
    const count = await this.fields.count({ where: { formId: id } });
    if (!count) throw new BadRequestException('Yayınlamak için en az bir alan ekleyin');
    if (!form.publicSlug) form.publicSlug = await this.uniqueSlug(form.name);
    const now = new Date();
    if (form.endsAt && form.endsAt.getTime() <= now.getTime()) {
      throw new BadRequestException('Bitiş tarihi geçmiş bir form yayınlanamaz');
    }
    form.status = 'ACTIVE';
    form.publishedAt = form.publishedAt ?? now;
    await this.forms.save(form);
    await this.audit.log('FORM_PUBLISH', 'Form', id, actor.id, companyId, null, { status: form.status });
    return this.get(companyId, id);
  }

  async setStatus(actor: FormActor, companyId: string, id: string, status: 'PASSIVE' | 'ACTIVE' | 'ARCHIVED') {
    const form = await this.requireOwned(companyId, id);
    if (status === 'ACTIVE' && form.status !== 'PASSIVE') {
      throw new BadRequestException('Yalnızca pasif form aktif yapılabilir');
    }
    form.status = status;
    if (status === 'ARCHIVED' || status === 'PASSIVE') form.closedAt = form.closedAt ?? new Date();
    await this.forms.save(form);
    await this.audit.log('FORM_STATUS', 'Form', id, actor.id, companyId, null, { status });
    return this.get(companyId, id);
  }

  async copy(actor: FormActor, companyId: string, id: string) {
    const source = await this.get(companyId, id);
    const created = await this.forms.save(
      this.forms.create({
        companyId,
        name: `${source.name} (Kopya)`.slice(0, 160),
        title: source.title,
        description: source.description,
        logoUrl: source.logoUrl,
        companyNameOverride: source.companyNameOverride,
        thankYouMessage: source.thankYouMessage,
        personalized: source.personalized,
        singleSubmission: source.singleSubmission,
        allowEdit: source.allowEdit,
        smsBody: source.smsBody,
        originatorId: source.originatorId,
        audience: source.audience ?? undefined,
        status: 'DRAFT',
        createdBy: actor.id,
      }),
    );
    if (source.fields?.length) {
      const entities = source.fields.map((f: any) =>
        this.fields.create({
          formId: created.id,
          type: f.type,
          label: f.label,
          description: f.description || undefined,
          placeholder: f.placeholder || undefined,
          required: f.required,
          defaultValue: f.defaultValue || undefined,
          position: f.position,
          validation: f.validation ?? undefined,
          options: f.options ?? undefined,
        }),
      );
      await this.fields.save(entities);
    }
    await this.audit.log('FORM_COPY', 'Form', created.id, actor.id, companyId, null, { from: id });
    return this.get(companyId, created.id);
  }

  async dashboard(companyId: string) {
    await this.refreshCompany(companyId);
    const [result] = await this.dataSource.query(
      `SELECT
         COUNT(*) FILTER (WHERE true)::int AS total,
         COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
         COALESCE(SUM(submission_count), 0)::int AS submissions,
         COUNT(*) FILTER (WHERE status = 'DRAFT')::int AS drafts
       FROM forms WHERE company_id = $1`,
      [companyId],
    );
    const [sub] = await this.dataSource.query(
      `SELECT
         COUNT(*) FILTER (WHERE fs.created_at >= CURRENT_DATE)::int AS today,
         COUNT(*) FILTER (WHERE fs.created_at >= date_trunc('month', CURRENT_DATE))::int AS this_month,
         COUNT(*) FILTER (WHERE fs.status = 'NEW')::int AS incomplete
       FROM form_submissions fs
       JOIN forms f ON f.id = fs.form_id
       WHERE f.company_id = $1`,
      [companyId],
    );
    return {
      total: result?.total ?? 0,
      active: result?.active ?? 0,
      submissions: result?.submissions ?? 0,
      drafts: result?.drafts ?? 0,
      today: sub?.today ?? 0,
      thisMonth: sub?.this_month ?? 0,
      incomplete: sub?.incomplete ?? 0,
    };
  }

  async templatesFor(companyId: string) {
    const rows = await this.templates.find({
      where: [{ isSystem: true, companyId: IsNull() }, { companyId }],
      order: { isSystem: 'DESC', name: 'ASC' },
    });
    return rows.map((r) => this.presentTemplate(r));
  }

  async createTemplate(actor: FormActor, companyId: string, dto: CreateFormTemplateDto) {
    if (!dto.fields.length) throw new BadRequestException('Şablonda en az bir alan olmalı');
    const saved = await this.templates.save(
      this.templates.create({
        companyId,
        name: dto.name.trim(),
        description: dto.description?.trim() || undefined,
        category: dto.category,
        isSystem: false,
        definition: { fields: dto.fields.map((f) => this.templateField(f)) },
      }),
    );
    await this.audit.log('FORM_TEMPLATE_CREATE', 'FormTemplate', saved.id, actor.id, companyId, null, { name: saved.name });
    return this.presentTemplate(saved);
  }

  async removeTemplate(actor: FormActor, companyId: string, id: string) {
    const template = await this.templates.findOne({ where: { id, companyId } });
    if (!template || template.isSystem) throw new NotFoundException('Şablon bulunamadı');
    await this.templates.delete({ id });
    await this.audit.log('FORM_TEMPLATE_DELETE', 'FormTemplate', id, actor.id, companyId, { name: template.name }, null);
    return { id };
  }

  async createFromTemplate(actor: FormActor, companyId: string, templateId: string) {
    const template = await this.templates.findOne({ where: { id: templateId } });
    if (!template || (template.companyId && template.companyId !== companyId)) {
      throw new NotFoundException('Şablon bulunamadı');
    }
    const created = await this.create(actor, companyId, { name: template.name, title: template.name, description: template.description });
    const templateFields = template.definition?.fields ?? [];
    if (templateFields.length) {
      await this.saveFields(actor, companyId, created.id, {
        fields: templateFields.map((f, index) => ({
          type: f.type,
          label: f.label,
          description: f.description,
          placeholder: f.placeholder,
          required: Boolean(f.required),
          defaultValue: f.defaultValue,
          position: index,
          validation: f.validation,
          options: f.options,
        })),
      });
    }
    return this.get(companyId, created.id);
  }

  async requireOwned(companyId: string, id: string) {
    const form = await this.forms.findOne({ where: { id, companyId } });
    if (!form) throw new NotFoundException('Form bulunamadı');
    return form;
  }

  async branding(form: Form) {
    const company = await this.companies.findOne({ where: { id: form.companyId } });
    return {
      companyName: form.companyNameOverride || company?.name || '',
      logoUrl: form.logoUrl || '',
      thankYouMessage: form.thankYouMessage || DEFAULT_THANKS,
    };
  }

  private toListItem(form: Form, stats?: { submissions: number; lastSubmission: string | null }) {
    return {
      id: form.id,
      name: form.name,
      title: form.title,
      description: form.description ?? '',
      status: form.status,
      personalized: form.personalized,
      singleSubmission: form.singleSubmission,
      allowEdit: form.allowEdit,
      startsAt: form.startsAt?.toISOString() ?? null,
      endsAt: form.endsAt?.toISOString() ?? null,
      maxSubmissions: form.maxSubmissions ?? null,
      publicSlug: form.publicSlug ?? '',
      smsBody: form.smsBody ?? '',
      originatorId: form.originatorId ?? '',
      audience: form.audience ?? null,
      logoUrl: form.logoUrl ?? '',
      companyNameOverride: form.companyNameOverride ?? '',
      thankYouMessage: form.thankYouMessage ?? '',
      submissions: stats?.submissions ?? form.submissionCount,
      lastSubmission: stats?.lastSubmission ?? null,
      createdAt: form.createdAt.toISOString(),
      publishedAt: form.publishedAt?.toISOString() ?? null,
    };
  }

  private async submissionStats(formIds: string[]) {
    const map = new Map<string, { submissions: number; lastSubmission: string | null }>();
    if (!formIds.length) return map;
    const rows: { form_id: string; cnt: string; last: string | null }[] = await this.dataSource.query(
      `SELECT form_id, COUNT(*)::int AS cnt, MAX(created_at)::text AS last
       FROM form_submissions WHERE form_id = ANY($1) GROUP BY form_id`,
      [formIds],
    );
    for (const row of rows) {
      map.set(row.form_id, { submissions: Number(row.cnt), lastSubmission: row.last });
    }
    return map;
  }

  private async uniqueSlug(name: string) {
    const base = slugifyFormName(name);
    const suffix = randomBytes(3).toString('hex');
    const slug = `${base}-${suffix}`;
    const existing = await this.forms.findOne({ where: { publicSlug: slug } });
    return existing ? `${base}-${randomBytes(4).toString('hex')}` : slug;
  }

  private presentTemplate(row: FormTemplate) {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      category: row.category ?? '',
      isSystem: row.isSystem,
      fields: (row.definition?.fields ?? []).map((f: FormTemplateField) => ({
        type: f.type,
        label: f.label,
        description: f.description ?? '',
        placeholder: f.placeholder ?? '',
        required: Boolean(f.required),
        options: f.options ?? [],
      })),
    };
  }

  private templateField(f: any): FormTemplateField {
    return {
      type: f.type,
      label: f.label,
      description: f.description || undefined,
      placeholder: f.placeholder || undefined,
      required: Boolean(f.required),
      defaultValue: f.defaultValue || undefined,
      validation: f.validation || undefined,
      options: f.options || undefined,
    };
  }
}
