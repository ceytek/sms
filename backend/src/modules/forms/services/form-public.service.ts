import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { SubmitFormDto } from '../dto/form.dto.js';
import { FormField } from '../entities/form-field.entity.js';
import { FormFile } from '../entities/form-file.entity.js';
import { FormRecipient } from '../entities/form-recipient.entity.js';
import { FormSubmission } from '../entities/form-submission.entity.js';
import { Form } from '../entities/form.entity.js';
import { FormAccessService } from './form-access.service.js';
import { FormService } from './form.service.js';

const ALLOWED_FILE_MIME = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class FormPublicService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly formService: FormService,
    private readonly access: FormAccessService,
    @InjectRepository(Form) private readonly formRepo: Repository<Form>,
    @InjectRepository(FormField) private readonly fieldRepo: Repository<FormField>,
    @InjectRepository(FormRecipient) private readonly recipientRepo: Repository<FormRecipient>,
    @InjectRepository(FormSubmission) private readonly submissionRepo: Repository<FormSubmission>,
    @InjectRepository(FormFile) private readonly fileRepo: Repository<FormFile>,
  ) {}

  async bySlug(slug: string) {
    const form = await this.formRepo.findOne({ where: { publicSlug: slug } });
    if (!form) throw new NotFoundException('Form bulunamadı');
    await this.assertPublicAccess(form);
    return this.present(form, null);
  }

  async byToken(token: string) {
    const recipient = await this.recipientRepo.findOne({ where: { token } });
    if (!recipient) throw new NotFoundException('Form bağlantısı geçersiz');
    const form = await this.formRepo.findOne({ where: { id: recipient.formId, companyId: recipient.companyId } });
    if (!form) throw new NotFoundException('Form bulunamadı');
    await this.assertPublicAccess(form);
    if (!['STARTED', 'COMPLETED'].includes(recipient.inviteStatus)) {
      recipient.inviteStatus = 'OPENED';
    }
    recipient.openedAt = recipient.openedAt ?? new Date();
    await this.recipientRepo.save(recipient);
    const completed = form.singleSubmission
      ? await this.submissionRepo.findOne({ where: { formId: form.id, recipientId: recipient.id } })
      : null;
    return {
      ...(await this.present(form, recipient.id)),
      alreadyCompleted: Boolean(completed) && !form.allowEdit,
      allowEdit: form.allowEdit,
    };
  }

  async submit(
    token: string | null,
    slug: string | null,
    dto: SubmitFormDto,
    files: Express.Multer.File[] | undefined,
    ipAddress?: string,
  ) {
    const { form, recipient } = await this.resolve(token, slug);
    await this.assertPublicAccess(form);
    const fields = await this.fieldRepo.find({ where: { formId: form.id }, order: { position: 'ASC' } });
    this.validateSubmission(fields, dto.data, files);

    if (recipient && form.singleSubmission) {
      const existing = await this.submissionRepo.findOne({ where: { formId: form.id, recipientId: recipient.id } });
      if (existing && !form.allowEdit) throw new BadRequestException('Bu form daha önce doldurulmuş');
      if (existing && form.allowEdit) {
        existing.data = dto.data;
        existing.updatedAt = new Date();
        await this.submissionRepo.save(existing);
        await this.saveFiles(existing, fields, files);
        return { ok: true, message: (await this.formService.branding(form)).thankYouMessage };
      }
    }

    const channel = dto.channel || (recipient ? 'SMS' : 'PUBLIC');
    const submission = await this.submissionRepo.save(
      this.submissionRepo.create({
        formId: form.id,
        companyId: form.companyId,
        recipientId: recipient?.id,
        sessionKey: recipient ? undefined : dto.sessionKey,
        channel,
        status: 'NEW',
        data: dto.data,
        ipAddress,
        source: channel,
        startedAt: new Date(),
        completedAt: new Date(),
      }),
    );
    await this.saveFiles(submission, fields, files);
    await this.dataSource.query(
      `UPDATE forms SET submission_count = submission_count + 1, updated_at = now() WHERE id = $1`,
      [form.id],
    );
    if (recipient) {
      recipient.inviteStatus = 'COMPLETED';
      recipient.startedAt = recipient.startedAt ?? new Date();
      recipient.completedAt = new Date();
      recipient.openedAt = recipient.openedAt ?? new Date();
      await this.recipientRepo.save(recipient);
    }
    if (form.maxSubmissions) {
      const [count] = await this.dataSource.query(
        `SELECT COUNT(*)::int AS cnt FROM form_submissions WHERE form_id = $1`,
        [form.id],
      );
      if (Number(count?.cnt) >= form.maxSubmissions) {
        await this.dataSource.query(
          `UPDATE forms SET status = 'EXPIRED', closed_at = now(), updated_at = now() WHERE id = $1 AND status = 'ACTIVE'`,
          [form.id],
        );
      }
    }
    const branding = await this.formService.branding(form);
    return { ok: true, submissionId: submission.id, message: branding.thankYouMessage };
  }

  async qr(companyId: string, id: string) {
    const form = await this.formService.requireOwned(companyId, id);
    if (!form.publicSlug) throw new BadRequestException('QR için formu önce yayınlayın');
    return { url: `${this.origin()}/f/${form.publicSlug}?src=qr` };
  }

  private async resolve(token: string | null, slug: string | null) {
    if (token) {
      const recipient = await this.recipientRepo.findOne({ where: { token } });
      if (!recipient) throw new NotFoundException('Form bağlantısı geçersiz');
      const form = await this.formRepo.findOne({ where: { id: recipient.formId, companyId: recipient.companyId } });
      if (!form) throw new NotFoundException('Form bulunamadı');
      return { form, recipient };
    }
    const form = await this.formRepo.findOne({ where: { publicSlug: slug ?? '' } });
    if (!form) throw new NotFoundException('Form bulunamadı');
    return { form, recipient: null };
  }

  private async assertPublicAccess(form: Form) {
    const enabled = await this.access.isEnabled(form.companyId);
    if (!enabled) throw new BadRequestException('Bu form şu an aktif değil.');
    if (form.status !== 'ACTIVE') throw new BadRequestException('Bu form şu an yanıt kabul etmiyor.');
    const now = new Date();
    if (form.startsAt && form.startsAt.getTime() > now.getTime()) {
      const when = form.startsAt.toLocaleString('tr-TR', {
        timeZone: 'Europe/Istanbul',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      throw new BadRequestException(`Bu form ${when} tarihinde açılacak.`);
    }
    if (form.endsAt && form.endsAt.getTime() <= now.getTime()) {
      throw new BadRequestException('Bu formun süresi doldu.');
    }
    if (form.maxSubmissions) {
      const [count] = await this.dataSource.query(
        `SELECT COUNT(*)::int AS cnt FROM form_submissions WHERE form_id = $1`,
        [form.id],
      );
      if (Number(count?.cnt) >= form.maxSubmissions) {
        throw new BadRequestException('Bu form maksimum başvuru sayısına ulaştı.');
      }
    }
  }

  private async present(form: Form, recipientId: string | null) {
    const fields = await this.fieldRepo.find({ where: { formId: form.id }, order: { position: 'ASC' } });
    const branding = await this.formService.branding(form);
    return {
      id: form.id,
      title: form.title || form.name,
      description: form.description ?? '',
      companyName: branding.companyName,
      logoUrl: branding.logoUrl,
      thankYouMessage: branding.thankYouMessage,
      recipientId,
      fields: fields.map((f) => ({
        id: f.id,
        type: f.type,
        label: f.label,
        description: f.description ?? '',
        placeholder: f.placeholder ?? '',
        required: f.required,
        defaultValue: f.defaultValue ?? '',
        validation: f.validation ?? null,
        options: f.options ?? [],
      })),
    };
  }

  private validateSubmission(
    fields: FormField[],
    data: Record<string, unknown>,
    files?: Express.Multer.File[],
  ) {
    for (const field of fields) {
      if (field.type === 'HEADING') continue;
      const value = data[field.id];
      if (field.required && field.type !== 'FILE_UPLOAD') {
        if (value === undefined || value === null || value === '') {
          throw new BadRequestException(`"${field.label}" alanı zorunludur`);
        }
      }
      if (field.type === 'PHONE' && value) {
        const phone = String(value).trim();
        if (!/^(05\d{9}|5\d{9}|905\d{9}|\+905\d{9})$/.test(phone.replace(/\s/g, ''))) {
          throw new BadRequestException(`"${field.label}" geçerli bir telefon numarası olmalı`);
        }
      }
      if (field.type === 'EMAIL' && value) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          throw new BadRequestException(`"${field.label}" geçerli bir e-posta adresi olmalı`);
        }
      }
      if (field.type === 'NUMBER' && value !== undefined && value !== '') {
        const num = Number(value);
        if (isNaN(num)) throw new BadRequestException(`"${field.label}" sayı olmalı`);
        const v = field.validation as { min?: number; max?: number } | undefined;
        if (v?.min !== undefined && num < v.min) throw new BadRequestException(`"${field.label}" en az ${v.min} olmalı`);
        if (v?.max !== undefined && num > v.max) throw new BadRequestException(`"${field.label}" en fazla ${v.max} olmalı`);
      }
      if ((field.type === 'SHORT_TEXT' || field.type === 'LONG_TEXT') && value) {
        const v = field.validation as { minLength?: number; maxLength?: number } | undefined;
        const text = String(value);
        if (v?.minLength && text.length < v.minLength) {
          throw new BadRequestException(`"${field.label}" en az ${v.minLength} karakter olmalı`);
        }
        if (v?.maxLength && text.length > v.maxLength) {
          throw new BadRequestException(`"${field.label}" en fazla ${v.maxLength} karakter olmalı`);
        }
      }
      if (field.type === 'FILE_UPLOAD') {
        const file = files?.find((f) => f.fieldname === field.id);
        if (field.required && !file) {
          throw new BadRequestException(`"${field.label}" dosyası zorunludur`);
        }
        if (file) {
          const v = field.validation as { allowedTypes?: string[]; maxFileSize?: number } | undefined;
          if (v?.maxFileSize && file.size > v.maxFileSize) {
            throw new BadRequestException(`"${field.label}" dosya boyutu sınırı aşıldı`);
          }
          if (v?.allowedTypes?.length && !v.allowedTypes.includes(file.mimetype)) {
            throw new BadRequestException(`"${field.label}" dosya türü desteklenmiyor`);
          }
          if (!ALLOWED_FILE_MIME.has(file.mimetype)) {
            throw new BadRequestException(`"${field.label}" dosya türü kabul edilmiyor`);
          }
          if (file.size > MAX_FILE_BYTES) {
            throw new BadRequestException(`"${field.label}" dosya boyutu 10 MB sınırını aşıyor`);
          }
        }
      }
    }
  }

  private async saveFiles(submission: FormSubmission, fields: FormField[], files?: Express.Multer.File[]) {
    if (!files?.length) return;
    for (const file of files) {
      const field = fields.find((f) => f.id === file.fieldname);
      if (!field || field.type !== 'FILE_UPLOAD') continue;
      const dir = join(process.cwd(), 'uploads', 'form-files', submission.companyId, submission.id);
      await mkdir(dir, { recursive: true });
      const ext = extname(file.originalname || '').toLowerCase() || '.bin';
      const filename = `${randomUUID()}${ext}`;
      await writeFile(join(dir, filename), file.buffer);
      await this.fileRepo.save(
        this.fileRepo.create({
          submissionId: submission.id,
          fieldId: field.id,
          companyId: submission.companyId,
          fileName: file.originalname,
          filePath: join('uploads', 'form-files', submission.companyId, submission.id, filename),
          fileSize: file.size,
          mimeType: file.mimetype,
        }),
      );
    }
  }

  private origin() {
    return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  }
}
