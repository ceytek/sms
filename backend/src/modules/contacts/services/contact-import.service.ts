import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { Contact } from '../entities/contact.entity.js';
import { ContactImportJob } from '../entities/contact-import-job.entity.js';
import { ContactImportError } from '../entities/contact-import-error.entity.js';
import { ContactAccessService, type ContactActor } from './contact-access.service.js';
import { ContactGroupsService } from './contact-groups.service.js';
import { ContactTagsService } from './contact-tags.service.js';
import { ContactCustomFieldsService } from './contact-custom-fields.service.js';
import { ContactsService } from './contacts.service.js';
import { detectImportKind, parseSpreadsheet } from './import-file.js';
import {
  BulkNumbersDto,
  CompanySourceQueryDto,
  ImportAnalyzeDto,
  ImportCommitDto,
  ImportFromCompaniesDto,
  ImportMappingDto,
} from '../dto/import.dto.js';
import { ContactImportType } from '../../../common/enums/contact-import-type.enum.js';
import { ContactImportStatus } from '../../../common/enums/contact-import-status.enum.js';
import { ContactDuplicatePolicy } from '../../../common/enums/contact-duplicate-policy.enum.js';
import { ContactImportErrorType } from '../../../common/enums/contact-import-error-type.enum.js';
import { ContactSource } from '../../../common/enums/contact-source.enum.js';
import { ContactStatus } from '../../../common/enums/contact-status.enum.js';
import { Role } from '../../../common/enums/role.enum.js';
import { CompanyStatus } from '../../../common/enums/company-status.enum.js';
import { normalizeTrMobile } from '../../../common/phone/normalize-tr-mobile.js';

type AnalyzedRow = {
  rowNumber: number;
  raw: Record<string, string>;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyName?: string;
  notes?: string;
  tagName?: string;
  customFields?: Record<string, string>;
  mobileRaw: string;
  normalized?: string;
  errorType?: ContactImportErrorType;
  errorMessage?: string;
  existingId?: string;
};

@Injectable()
export class ContactImportService {
  constructor(
    @InjectRepository(ContactImportJob)
    private readonly jobRepository: Repository<ContactImportJob>,
    @InjectRepository(ContactImportError)
    private readonly errorRepository: Repository<ContactImportError>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly access: ContactAccessService,
    private readonly groupsService: ContactGroupsService,
    private readonly tagsService: ContactTagsService,
    private readonly customFieldsService: ContactCustomFieldsService,
    private readonly contactsService: ContactsService,
  ) {}

  async previewFile(file: Express.Multer.File, actor: ContactActor) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Dosya yükleyin');
    }
    const kind = detectImportKind(file);
    let parsed: { columns: string[]; rows: Record<string, string>[] };
    try {
      parsed = parseSpreadsheet(file);
    } catch {
      throw new BadRequestException('Dosya okunamadı. xlsx, xls veya csv yükleyin');
    }
    if (!parsed.columns.length) {
      throw new BadRequestException('Dosyada kolon bulunamadı');
    }
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const job = await this.jobRepository.save(
      this.jobRepository.create({
        ownerCompanyId,
        fileName: file.originalname,
        importType: kind === 'CSV' ? ContactImportType.CSV : ContactImportType.EXCEL,
        status: ContactImportStatus.PREVIEW,
        columns: parsed.columns,
        rawRows: parsed.rows,
        totalRows: parsed.rows.length,
        createdBy: actor.id,
      }),
    );
    return {
      jobId: job.id,
      fileName: job.fileName,
      importType: job.importType,
      columns: parsed.columns,
      totalRows: parsed.rows.length,
      sampleRows: parsed.rows.slice(0, 8),
    };
  }

  async analyze(dto: ImportAnalyzeDto, actor: ContactActor) {
    const job = await this.requirePreviewJob(dto.jobId, actor);
    if (!dto.mapping?.mobile) {
      throw new BadRequestException('Telefon kolonu eşleştirmesi zorunlu');
    }
    job.mapping = dto.mapping as unknown as Record<string, string>;
    const analysis = await this.analyzeRows(job, dto.mapping);
    await this.persistAnalysis(job, analysis);
    return this.toPreviewDto(job, analysis.errors.slice(0, 100));
  }

  async commit(dto: ImportCommitDto, actor: ContactActor) {
    const job = await this.requirePreviewJob(dto.jobId, actor);
    const mapping = (dto.mapping ?? job.mapping) as ImportMappingDto | undefined;
    if (!mapping?.mobile && job.importType !== ContactImportType.BULK_NUMBERS && job.importType !== ContactImportType.COMPANY) {
      throw new BadRequestException('Önce kolon eşleştirmesini tamamlayın');
    }
    if (dto.mapping) job.mapping = dto.mapping as unknown as Record<string, string>;
    job.duplicatePolicy = dto.duplicatePolicy ?? job.duplicatePolicy;
    const analysis = await this.analyzeRows(
      job,
      mapping ?? { mobile: 'Telefon' },
    );
    const ownerCompanyId = job.ownerCompanyId;
    const groupIds = [...(dto.groupIds ?? [])];
    if (dto.autoGroupName?.trim()) {
      const group = await this.groupsService.findOrCreate(ownerCompanyId, dto.autoGroupName.trim(), actor.id);
      if (!groupIds.includes(group.id)) groupIds.push(group.id);
    }
    const requiresGroup =
      job.importType === ContactImportType.EXCEL ||
      job.importType === ContactImportType.CSV ||
      job.importType === ContactImportType.BULK_NUMBERS;
    if (requiresGroup && !groupIds.length) {
      throw new BadRequestException('Aktarım için en az bir grup seçin');
    }
    if (groupIds.length) await this.groupsService.requireGroups(ownerCompanyId, groupIds);
    const tagIds = [...(dto.tagIds ?? [])];
    if (tagIds.length) await this.tagsService.requireTags(ownerCompanyId, tagIds);
    const source =
      job.importType === ContactImportType.CSV
        ? ContactSource.CSV
        : job.importType === ContactImportType.BULK_NUMBERS
          ? ContactSource.BULK_NUMBERS
          : job.importType === ContactImportType.COMPANY
            ? ContactSource.COMPANY_IMPORT
            : ContactSource.EXCEL;

    let successful = 0;
    for (const row of analysis.rows) {
      if (row.errorType && row.errorType !== ContactImportErrorType.EXISTS && row.errorType !== ContactImportErrorType.DUPLICATE) {
        continue;
      }
      if (!row.normalized) continue;

      if (row.existingId) {
        if (job.duplicatePolicy === ContactDuplicatePolicy.SKIP) continue;
        const existing = await this.contactRepository.findOne({ where: { id: row.existingId } });
        if (!existing) continue;
        if (job.duplicatePolicy === ContactDuplicatePolicy.UPDATE) {
          existing.firstName = row.firstName || existing.firstName;
          existing.lastName = row.lastName || existing.lastName;
          existing.email = row.email || existing.email;
          existing.companyName = row.companyName || existing.companyName;
          existing.notes = row.notes || existing.notes;
          if (row.customFields) {
            existing.customFields = {
              ...(existing.customFields ?? {}),
              ...row.customFields,
            };
          }
          existing.updatedBy = actor.id;
          await this.contactRepository.save(existing);
        }
        if (groupIds.length) await this.contactsService.addGroupMembers([existing.id], groupIds[0]);
        for (const groupId of groupIds.slice(1)) {
          await this.contactsService.addGroupMembers([existing.id], groupId);
        }
        for (const tagId of tagIds) {
          await this.contactsService.addTagMembers([existing.id], tagId);
        }
        if (row.tagName) {
          const tag = await this.tagsService.findOrCreate(ownerCompanyId, row.tagName, actor.id);
          await this.contactsService.addTagMembers([existing.id], tag.id);
        }
        successful += 1;
        continue;
      }

      if (row.errorType === ContactImportErrorType.DUPLICATE) continue;

      const created = await this.contactRepository.save(
        this.contactRepository.create({
          ownerCompanyId,
          firstName: row.firstName,
          lastName: row.lastName,
          mobilePhone: row.mobileRaw,
          normalizedPhone: row.normalized,
          email: row.email,
          companyName: row.companyName,
          notes: row.notes,
          customFields: row.customFields,
          sourceCompanyId: row.raw.sourceCompanyId || undefined,
          source,
          status: dto.status ?? ContactStatus.ACTIVE,
          createdBy: actor.id,
          updatedBy: actor.id,
        }),
      );
      const extraTagIds = [...tagIds];
      if (row.tagName) {
        const tag = await this.tagsService.findOrCreate(ownerCompanyId, row.tagName, actor.id);
        extraTagIds.push(tag.id);
      }
      await this.contactsService.replaceMemberships(created.id, groupIds, extraTagIds);
      successful += 1;
    }

    await this.persistAnalysis(job, analysis);
    job.status = ContactImportStatus.COMPLETED;
    job.successfulRows = successful;
    job.completedAt = new Date();
    await this.jobRepository.save(job);
    return this.toPreviewDto(job, analysis.errors.slice(0, 100));
  }

  async previewBulk(dto: BulkNumbersDto, actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const lines = dto.numbers
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    const rows = lines.map((mobile) => ({ Telefon: mobile }));
    const job = await this.jobRepository.save(
      this.jobRepository.create({
        ownerCompanyId,
        fileName: 'toplu-numara',
        importType: ContactImportType.BULK_NUMBERS,
        status: ContactImportStatus.PREVIEW,
        columns: ['Telefon'],
        mapping: { mobile: 'Telefon' },
        rawRows: rows,
        totalRows: rows.length,
        duplicatePolicy: dto.duplicatePolicy ?? ContactDuplicatePolicy.SKIP,
        createdBy: actor.id,
      }),
    );
    const analysis = await this.analyzeRows(job, { mobile: 'Telefon' });
    await this.persistAnalysis(job, analysis);
    return this.toPreviewDto(job, analysis.errors.slice(0, 100));
  }

  async listJobs(actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const jobs = await this.jobRepository.find({
      where: { ownerCompanyId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return jobs.map((job) => this.toJobDto(job));
  }

  async getJob(id: string, actor: ContactActor) {
    const job = await this.requireJob(id, actor);
    const errors = await this.errorRepository.find({
      where: { importJobId: job.id },
      order: { rowNumber: 'ASC' },
      take: 500,
    });
    return this.toPreviewDto(job, errors);
  }

  async listCompanySources(query: CompanySourceQueryDto, actor: ContactActor) {
    const companies = await this.loadImportableCompanies(actor, query);
    return {
      items: companies.map((company) => ({
        id: company.id,
        name: company.name,
        mobile: company.mobile ?? '',
        categoryName: company.category?.name ?? '',
        subcategoryName: company.subcategory?.name ?? '',
      })),
      total: companies.length,
    };
  }

  async previewCompanies(dto: ImportFromCompaniesDto, actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const companies = await this.loadImportableCompanies(actor, dto);
    const selected = dto.companyIds?.length
      ? companies.filter((item) => dto.companyIds!.includes(item.id))
      : companies;
    const rows = selected.map((company) => ({
      Ad: company.name,
      Telefon: company.mobile ?? '',
      Firma: company.name,
      sourceCompanyId: company.id,
    }));
    const job = await this.jobRepository.save(
      this.jobRepository.create({
        ownerCompanyId,
        fileName: dto.autoGroupName || 'firma-aktarimi',
        importType: ContactImportType.COMPANY,
        status: ContactImportStatus.PREVIEW,
        columns: ['Ad', 'Telefon', 'Firma'],
        mapping: { firstName: 'Ad', mobile: 'Telefon', companyName: 'Firma' },
        rawRows: rows,
        totalRows: rows.length,
        duplicatePolicy: dto.duplicatePolicy ?? ContactDuplicatePolicy.SKIP,
        createdBy: actor.id,
      }),
    );
    const analysis = await this.analyzeRows(job, {
      firstName: 'Ad',
      mobile: 'Telefon',
      companyName: 'Firma',
    });
    await this.persistAnalysis(job, analysis);
    return this.toPreviewDto(job, analysis.errors.slice(0, 100));
  }

  private async loadImportableCompanies(
    actor: ContactActor,
    query: { categoryId?: string; subcategoryId?: string; search?: string; companyIds?: string[] },
  ) {
    const impersonator = await this.access.companyImportActor(actor);
    const qb = this.companyRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.category', 'category')
      .leftJoinAndSelect('company.subcategory', 'subcategory')
      .where('company.deleted_at IS NULL')
      .andWhere('company.status = :status', { status: CompanyStatus.ACTIVE })
      .andWhere('company.is_dealer = false');

    if (impersonator) {
      if (impersonator.role === Role.DEALER) {
        qb.andWhere('company.dealer_company_id = :dealerCompanyId', {
          dealerCompanyId: impersonator.companyId,
        });
      } else {
        qb.andWhere('(company.is_dealer = true OR company.dealer_company_id IS NULL)');
        qb.andWhere('company.company_code != :adminCode', { adminCode: 'ADMIN' });
        qb.andWhere('company.is_dealer = false');
      }
    } else {
      qb.andWhere('company.id = :ownId', { ownId: this.access.ownerCompanyId(actor) });
    }

    if (query.categoryId) qb.andWhere('company.category_id = :categoryId', { categoryId: query.categoryId });
    if (query.subcategoryId) {
      qb.andWhere('company.subcategory_id = :subcategoryId', { subcategoryId: query.subcategoryId });
    }
    if (query.search) {
      qb.andWhere('(company.name ILIKE :search OR company.mobile ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }
    if (query.companyIds?.length) {
      qb.andWhere('company.id IN (:...companyIds)', { companyIds: query.companyIds });
    }
    return qb.orderBy('company.name', 'ASC').take(5000).getMany();
  }

  private async analyzeRows(job: ContactImportJob, mapping: ImportMappingDto) {
    const rows = job.rawRows ?? [];
    const existing = await this.contactRepository.find({
      where: { ownerCompanyId: job.ownerCompanyId },
      select: ['id', 'normalizedPhone'],
    });
    const fieldDefs = await this.customFieldsService.listActive(job.ownerCompanyId);
    const existingByPhone = new Map(existing.map((item) => [item.normalizedPhone, item.id]));
    const seen = new Map<string, number>();
    const analyzed: AnalyzedRow[] = [];
    const errors: Partial<ContactImportError>[] = [];

    rows.forEach((raw, index) => {
      const rowNumber = index + 2;
      const mobileRaw = String(raw[mapping.mobile] ?? raw.Telefon ?? '').trim();
      const firstName = mapping.firstName ? String(raw[mapping.firstName] ?? '').trim() : undefined;
      const lastName = mapping.lastName ? String(raw[mapping.lastName] ?? '').trim() : undefined;
      const email = mapping.email ? String(raw[mapping.email] ?? '').trim() : undefined;
      const companyName = mapping.companyName ? String(raw[mapping.companyName] ?? '').trim() : undefined;
      const notes = mapping.notes ? String(raw[mapping.notes] ?? '').trim() : undefined;
      const tagName = mapping.tag ? String(raw[mapping.tag] ?? '').trim() : undefined;
      const customRaw: Record<string, string> = {};
      for (const field of fieldDefs) {
        const column = mapping.customFields?.[field.id];
        if (!column) continue;
        const value = String(raw[column] ?? '').trim();
        if (value) customRaw[field.id] = value;
      }
      const customFields = this.customFieldsService.filterValues(fieldDefs, customRaw);
      const row: AnalyzedRow = {
        rowNumber,
        raw,
        firstName,
        lastName,
        email,
        companyName,
        notes,
        tagName,
        customFields,
        mobileRaw,
      };

      if (!mobileRaw) {
        row.errorType = ContactImportErrorType.MISSING_PHONE;
        row.errorMessage = 'Telefon eksik';
      } else {
        const normalized = normalizeTrMobile(mobileRaw);
        if (!normalized) {
          row.errorType = ContactImportErrorType.INVALID_PHONE;
          row.errorMessage = 'Telefon formatı geçersiz';
        } else {
          row.normalized = normalized;
          if (seen.has(normalized)) {
            row.errorType = ContactImportErrorType.DUPLICATE;
            row.errorMessage = 'Dosyada mükerrer kayıt';
          } else {
            seen.set(normalized, rowNumber);
            const existingId = existingByPhone.get(normalized);
            if (existingId) {
              row.existingId = existingId;
              row.errorType = ContactImportErrorType.EXISTS;
              row.errorMessage = 'Mevcut rehberde bulunan';
            }
          }
        }
      }

      analyzed.push(row);
      if (row.errorType) {
        errors.push({
          importJobId: job.id,
          rowNumber,
          rawData: raw,
          errorType: row.errorType,
          errorMessage: row.errorMessage ?? 'Hata',
        });
      }
    });

    const failed = analyzed.filter(
      (row) =>
        row.errorType === ContactImportErrorType.MISSING_PHONE ||
        row.errorType === ContactImportErrorType.INVALID_PHONE,
    ).length;
    const duplicate = analyzed.filter((row) => row.errorType === ContactImportErrorType.DUPLICATE).length;
    const existingCount = analyzed.filter((row) => row.errorType === ContactImportErrorType.EXISTS).length;
    const valid = analyzed.length - failed;

    job.totalRows = analyzed.length;
    job.validRows = valid;
    job.failedRows = failed;
    job.duplicateRows = duplicate;
    job.existingRows = existingCount;

    return { rows: analyzed, errors, valid, failed, duplicate, existingCount };
  }

  private async persistAnalysis(
    job: ContactImportJob,
    analysis: { errors: Partial<ContactImportError>[]; valid: number; failed: number; duplicate: number; existingCount: number },
  ) {
    await this.errorRepository.delete({ importJobId: job.id });
    if (analysis.errors.length) {
      await this.errorRepository.save(
        analysis.errors.slice(0, 2000).map((item) => this.errorRepository.create(item)),
      );
    }
    job.validRows = analysis.valid;
    job.failedRows = analysis.failed;
    job.duplicateRows = analysis.duplicate;
    job.existingRows = analysis.existingCount;
    await this.jobRepository.save(job);
  }

  private async requireJob(id: string, actor: ContactActor) {
    const job = await this.jobRepository.findOne({
      where: { id, ownerCompanyId: this.access.ownerCompanyId(actor) },
    });
    if (!job) throw new NotFoundException('Aktarım kaydı bulunamadı');
    return job;
  }

  private async requirePreviewJob(id: string, actor: ContactActor) {
    const job = await this.requireJob(id, actor);
    if (job.status !== ContactImportStatus.PREVIEW) {
      throw new BadRequestException('Bu aktarım zaten tamamlandı');
    }
    return job;
  }

  private toJobDto(job: ContactImportJob) {
    return {
      id: job.id,
      fileName: job.fileName ?? '',
      importType: job.importType,
      status: job.status,
      totalRows: job.totalRows,
      validRows: job.validRows,
      successfulRows: job.successfulRows,
      failedRows: job.failedRows,
      duplicateRows: job.duplicateRows,
      existingRows: job.existingRows,
      createdAt: job.createdAt,
      completedAt: job.completedAt ?? null,
    };
  }

  private toPreviewDto(job: ContactImportJob, errors: Array<Partial<ContactImportError> | ContactImportError>) {
    return {
      ...this.toJobDto(job),
      columns: job.columns ?? [],
      mapping: job.mapping ?? null,
      errors: errors.map((item) => ({
        rowNumber: item.rowNumber ?? null,
        errorType: item.errorType,
        errorMessage: item.errorMessage,
        rawData: item.rawData ?? null,
      })),
    };
  }
}
