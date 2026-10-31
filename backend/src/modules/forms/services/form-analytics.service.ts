import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { FormField } from '../entities/form-field.entity.js';
import { FormFile } from '../entities/form-file.entity.js';
import { FormSubmission } from '../entities/form-submission.entity.js';
import { Form } from '../entities/form.entity.js';
import { SubmissionQueryDto, UpdateSubmissionStatusDto } from '../dto/form.dto.js';
import { AuditService } from '../../audit/audit.service.js';
import type { FormActor } from './form-access.service.js';
import * as XLSX from 'xlsx';

@Injectable()
export class FormAnalyticsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    @InjectRepository(FormSubmission) private readonly submissions: Repository<FormSubmission>,
    @InjectRepository(Form) private readonly forms: Repository<Form>,
    @InjectRepository(FormField) private readonly fields: Repository<FormField>,
    @InjectRepository(FormFile) private readonly files: Repository<FormFile>,
  ) {}

  async listSubmissions(companyId: string, query: SubmissionQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const summaryScope = this.submissionWhere(companyId, query, false);
    const [summaryRow] = await this.dataSource.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE s.status = 'NEW')::int AS fresh,
         COUNT(*) FILTER (WHERE s.status = 'IN_REVIEW')::int AS in_review,
         COUNT(*) FILTER (WHERE s.status = 'APPROVED')::int AS approved
       FROM form_submissions s
       WHERE ${summaryScope.where}`,
      summaryScope.params,
    );
    const listed = this.submissionWhere(companyId, query, true);
    const [countRow] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total FROM form_submissions s WHERE ${listed.where}`,
      listed.params,
    );
    listed.params.push(limit, (page - 1) * limit);
    const rows: FormSubmission[] = await this.dataSource.query(
      `SELECT s.* FROM form_submissions s
       WHERE ${listed.where}
       ORDER BY s.created_at DESC
       LIMIT $${listed.params.length - 1} OFFSET $${listed.params.length}`,
      listed.params,
    );
    const mapped = rows.map((row) => this.hydrateSubmission(row));
    const formIds = [...new Set(mapped.map((row) => row.formId))];
    const formNames = new Map<string, string>();
    const fieldsByForm = new Map<string, FormField[]>();
    if (formIds.length) {
      const names: { id: string; name: string }[] = await this.dataSource.query(
        `SELECT id, name FROM forms WHERE id = ANY($1)`,
        [formIds],
      );
      for (const name of names) formNames.set(name.id, name.name);
      const fields = await this.fields.find({ where: { formId: In(formIds) }, order: { position: 'ASC' } });
      for (const field of fields) {
        const list = fieldsByForm.get(field.formId) ?? [];
        list.push(field);
        fieldsByForm.set(field.formId, list);
      }
    }
    const total = Number(summaryRow?.total) || 0;
    const fresh = Number(summaryRow?.fresh) || 0;
    const inReview = Number(summaryRow?.in_review) || 0;
    const approved = Number(summaryRow?.approved) || 0;
    const share = (count: number) => (total ? Math.round((count / total) * 1000) / 10 : 0);
    return {
      items: mapped.map((row) => {
        const identity = this.identity(row.data, fieldsByForm.get(row.formId) ?? []);
        const started = row.startedAt ?? row.createdAt;
        const durationSeconds = row.completedAt
          ? Math.max(0, Math.round((row.completedAt.getTime() - started.getTime()) / 1000))
          : null;
        return {
          id: row.id,
          formId: row.formId,
          formName: formNames.get(row.formId) ?? '',
          channel: row.channel,
          status: row.status,
          source: row.source ?? null,
          data: row.data,
          name: identity.name,
          phone: identity.phone,
          ipAddress: row.ipAddress ?? null,
          startedAt: started.toISOString(),
          createdAt: row.createdAt.toISOString(),
          completedAt: row.completedAt?.toISOString() ?? null,
          durationSeconds,
        };
      }),
      total: Number(countRow?.total) || 0,
      page,
      limit,
      summary: {
        total,
        fresh,
        inReview,
        approved,
        freshRate: share(fresh),
        inReviewRate: share(inReview),
        approvedRate: share(approved),
      },
      meta: { total: Number(countRow?.total) || 0, page, limit, totalPages: Math.ceil((Number(countRow?.total) || 0) / limit) },
    };
  }

  async getSubmission(companyId: string, id: string) {
    const submission = await this.submissions.findOne({ where: { id, companyId } });
    if (!submission) throw new NotFoundException('Başvuru bulunamadı');
    const form = await this.forms.findOne({ where: { id: submission.formId } });
    const fields = form ? await this.fields.find({ where: { formId: form.id }, order: { position: 'ASC' } }) : [];
    const attachedFiles = await this.files.find({ where: { submissionId: id } });
    return {
      id: submission.id,
      formId: submission.formId,
      formName: form?.name ?? '',
      channel: submission.channel,
      status: submission.status,
      source: submission.source,
      data: submission.data,
      ipAddress: submission.ipAddress,
      createdAt: submission.createdAt.toISOString(),
      completedAt: submission.completedAt?.toISOString() ?? null,
      fields: fields.map((f) => ({
        id: f.id,
        type: f.type,
        label: f.label,
        position: f.position,
        options: f.options ?? [],
      })),
      files: attachedFiles.map((f) => ({
        id: f.id,
        fieldId: f.fieldId,
        fileName: f.fileName,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
      })),
    };
  }

  async updateSubmissionStatus(companyId: string, id: string, dto: UpdateSubmissionStatusDto, actor: FormActor) {
    const submission = await this.submissions.findOne({ where: { id, companyId } });
    if (!submission) throw new NotFoundException('Başvuru bulunamadı');
    const oldStatus = submission.status;
    submission.status = dto.status;
    await this.submissions.save(submission);
    await this.audit.log('FORM_SUBMISSION_STATUS', 'FormSubmission', id, actor.id, companyId, { status: oldStatus }, { status: dto.status });
    return { id, status: dto.status };
  }

  async exportSubmissions(companyId: string, query: SubmissionQueryDto) {
    const scope = this.submissionWhere(companyId, query, true);
    const raw: Record<string, unknown>[] = await this.dataSource.query(
      `SELECT s.* FROM form_submissions s WHERE ${scope.where} ORDER BY s.created_at DESC LIMIT 100000`,
      scope.params,
    );
    const rows = raw.map((row) => this.hydrateSubmission(row));
    const form = query.formId ? await this.forms.findOne({ where: { id: query.formId, companyId } }) : null;
    if (query.formId && !form) throw new NotFoundException('Form bulunamadı');
    const fields = form ? await this.fields.find({ where: { formId: form.id }, order: { position: 'ASC' } }) : [];
    const fieldsByForm = new Map<string, FormField[]>();
    if (!form) {
      const formIds = [...new Set(rows.map((row) => row.formId))];
      if (formIds.length) {
        const loaded = await this.fields.find({ where: { formId: In(formIds) } });
        for (const field of loaded) {
          const list = fieldsByForm.get(field.formId) ?? [];
          list.push(field);
          fieldsByForm.set(field.formId, list);
        }
      }
    }
    const names = new Map<string, string>();
    if (!form && rows.length) {
      const found: { id: string; name: string }[] = await this.dataSource.query(
        `SELECT id, name FROM forms WHERE id = ANY($1)`,
        [[...new Set(rows.map((row) => row.formId))]],
      );
      for (const item of found) names.set(item.id, item.name);
    }
    const data = rows.map((row) => {
      const identity = this.identity(row.data, form ? fields : fieldsByForm.get(row.formId) ?? []);
      const record: Record<string, unknown> = {
        'Ad Soyad': identity.name,
        Telefon: identity.phone,
        Form: form?.name ?? names.get(row.formId) ?? '',
        Durum: row.status,
        Yöntem: row.channel,
        Başvuru: (row.startedAt ?? row.createdAt).toISOString().slice(0, 19).replace('T', ' '),
        Tamamlanma: row.completedAt ? row.completedAt.toISOString().slice(0, 19).replace('T', ' ') : '',
      };
      if (form) {
        for (const field of fields) {
          if (field.type === 'HEADING') continue;
          record[field.label] = row.data[field.id] ?? '';
        }
      }
      return record;
    });
    const format = query.format === 'csv' ? 'csv' : 'xlsx';
    const sheet = XLSX.utils.json_to_sheet(data.length ? data : [{ 'Ad Soyad': '' }]);
    const base = (form?.name || 'basvurular').replace(/[^\wğüşıöçĞÜŞİÖÇ\s-]/g, '');
    if (format === 'csv') {
      return { buffer: Buffer.from(XLSX.utils.sheet_to_csv(sheet), 'utf-8'), contentType: 'text/csv', filename: `${base}.csv` };
    }
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Başvurular');
    return {
      buffer: Buffer.from(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' })),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${base}.xlsx`,
    };
  }

  private submissionWhere(companyId: string, query: SubmissionQueryDto, includeStatus: boolean) {
    const where = ['s.company_id = $1'];
    const params: unknown[] = [companyId];
    const add = (sql: string, value: unknown) => {
      params.push(value);
      where.push(sql.replace('?', `$${params.length}`));
    };
    if (query.formId) add('s.form_id = ?', query.formId);
    if (includeStatus && query.status) add('s.status = ?', query.status);
    if (query.channel) add('s.channel = ?', query.channel);
    if (query.q) add('s.data::text ILIKE ?', `%${query.q}%`);
    if (query.from) add(`s.created_at >= (?::timestamptz)`, `${query.from}T00:00:00+03:00`);
    if (query.to) add(`s.created_at <= (?::timestamptz)`, `${query.to}T23:59:59+03:00`);
    const ids = (query.ids ?? '').split(',').map((id) => id.trim()).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    if (ids.length) add('s.id = ANY(?)', ids);
    return { where: where.join(' AND '), params };
  }

  private hydrateSubmission(row: FormSubmission | Record<string, unknown>): FormSubmission {
    const source = row as Record<string, unknown>;
    const data = source.data;
    return {
      id: String(source.id),
      formId: String(source.form_id ?? source.formId),
      companyId: String(source.company_id ?? source.companyId),
      channel: String(source.channel ?? 'PUBLIC'),
      status: String(source.status ?? 'NEW'),
      data: (typeof data === 'string' ? JSON.parse(data) : data ?? {}) as Record<string, unknown>,
      ipAddress: (source.ip_address ?? source.ipAddress ?? undefined) as string | undefined,
      source: (source.source ?? undefined) as string | undefined,
      startedAt: this.asDate(source.started_at ?? source.startedAt),
      completedAt: this.asDate(source.completed_at ?? source.completedAt),
      createdAt: this.asDate(source.created_at ?? source.createdAt) ?? new Date(),
      updatedAt: this.asDate(source.updated_at ?? source.updatedAt) ?? new Date(),
    };
  }

  private asDate(value: unknown) {
    if (!value) return undefined;
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private identity(data: Record<string, unknown>, fields: FormField[]) {
    const text = (field: FormField) => String(data[field.id] ?? '').trim();
    const name = [...fields.filter((field) => field.type === 'FIRST_NAME'), ...fields.filter((field) => field.type === 'LAST_NAME')]
      .map(text)
      .filter(Boolean)
      .join(' ');
    const phone = fields.filter((field) => field.type === 'PHONE').map(text).find(Boolean) ?? '';
    return { name, phone };
  }
}
