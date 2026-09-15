import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createReadStream } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { In, Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum.js';
import { DocumentStatus } from '../../common/enums/document-status.enum.js';
import { DocumentProcessStatus } from '../../common/enums/document-process-status.enum.js';
import { Company } from '../companies/entities/company.entity.js';
import { CustomerCategory } from '../reference/entities/customer-category.entity.js';
import { DocumentType } from './entities/document-type.entity.js';
import { DocumentTypeAssignment } from './entities/document-type-assignment.entity.js';
import { CompanyDocument } from './entities/company-document.entity.js';
import { CompanyDocumentProcess } from './entities/company-document-process.entity.js';
import {
  CreateDocumentTypeDto,
  DocumentTypeAssignmentInputDto,
} from './dto/create-document-type.dto.js';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto.js';
import { CreateCustomDocumentDto, UpdateCompanyDocumentDto } from './dto/company-document.dto.js';

type Actor = { id: string; role: string; companyId: string };

const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentType)
    private readonly typeRepository: Repository<DocumentType>,
    @InjectRepository(DocumentTypeAssignment)
    private readonly assignmentRepository: Repository<DocumentTypeAssignment>,
    @InjectRepository(CompanyDocument)
    private readonly companyDocumentRepository: Repository<CompanyDocument>,
    @InjectRepository(CompanyDocumentProcess)
    private readonly processRepository: Repository<CompanyDocumentProcess>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(CustomerCategory)
    private readonly categoryRepository: Repository<CustomerCategory>,
  ) {}

  listTypes() {
    return this.typeRepository.find({
      relations: ['assignments', 'assignments.category'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    }).then((rows) => rows.map((row) => this.serializeType(row)));
  }

  async createType(dto: CreateDocumentTypeDto) {
    const existing = await this.typeRepository.findOne({ where: { name: dto.name.trim() } });
    if (existing) {
      throw new BadRequestException('Bu belge adı zaten kayıtlı');
    }

    const saved = await this.typeRepository.save(
      this.typeRepository.create({
        name: dto.name.trim(),
        description: dto.description?.trim() || undefined,
        isRequired: dto.isRequired,
        isActive: dto.isActive ?? true,
        appliesToAll: dto.appliesToAll ?? false,
        sortOrder: dto.sortOrder ?? 0,
      }),
    );

    if (dto.assignments?.length && !(dto.appliesToAll ?? false)) {
      await this.replaceAssignments(saved.id, dto.assignments);
    }

    return this.getType(saved.id);
  }

  async updateType(id: string, dto: UpdateDocumentTypeDto) {
    const type = await this.typeRepository.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Belge türü bulunamadı');

    if (dto.name && dto.name.trim() !== type.name) {
      const clash = await this.typeRepository.findOne({ where: { name: dto.name.trim() } });
      if (clash) throw new BadRequestException('Bu belge adı zaten kayıtlı');
      type.name = dto.name.trim();
    }
    if (dto.description !== undefined) type.description = dto.description.trim() || undefined;
    if (dto.isRequired !== undefined) type.isRequired = dto.isRequired;
    if (dto.isActive !== undefined) type.isActive = dto.isActive;
    if (dto.appliesToAll !== undefined) type.appliesToAll = dto.appliesToAll;
    if (dto.sortOrder !== undefined) type.sortOrder = dto.sortOrder;

    await this.typeRepository.save(type);
    if (type.appliesToAll) {
      await this.assignmentRepository.delete({ documentTypeId: id });
    } else if (dto.assignments) {
      await this.replaceAssignments(id, dto.assignments);
    }
    return this.getType(id);
  }

  async getType(id: string) {
    const type = await this.typeRepository.findOne({
      where: { id },
      relations: ['assignments', 'assignments.category'],
    });
    if (!type) throw new NotFoundException('Belge türü bulunamadı');
    return this.serializeType(type);
  }

  async getCompanyDocuments(companyId: string, actor: Actor) {
    const company = await this.assertCompanyAccess(companyId, actor);
    const process = await this.ensureProcess(company);
    const built = await this.buildChecklist(company);

    return {
      companyId: company.id,
      companyName: company.name,
      categoryName: company.category?.name ?? null,
      subcategoryName: company.subcategory?.name ?? null,
      process: {
        status: process.status,
        completedAt: process.completedAt ?? null,
        completedBy: process.completedBy ?? null,
      },
      summary: this.summarize(built.standard, built.custom),
      standard: built.standard,
      custom: built.custom,
    };
  }

  async getCompanyDocumentSummary(companyId: string) {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['category', 'subcategory'],
    });
    if (!company) {
      return {
        documentProcessStatus: DocumentProcessStatus.IN_PROGRESS,
        documentAvailableCount: 0,
        documentTotalCount: 0,
      };
    }
    const process = await this.ensureProcess(company);
    const built = await this.buildChecklist(company);
    const summary = this.summarize(built.standard, built.custom);
    return {
      documentProcessStatus: process.status,
      documentAvailableCount: summary.availableCount,
      documentTotalCount: summary.totalCount,
    };
  }

  async createCustomDocument(companyId: string, dto: CreateCustomDocumentDto, actor: Actor) {
    await this.assertCompanyAccess(companyId, actor);
    await this.ensureProcessById(companyId);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Belge adı boş olamaz');

    const saved = await this.companyDocumentRepository.save(
      this.companyDocumentRepository.create({
        companyId,
        customDocumentName: name,
        documentStatus: DocumentStatus.PENDING,
      }),
    );
    return this.serializeCompanyDoc(saved, name, false, false);
  }

  async updateCompanyDocument(
    companyId: string,
    dto: UpdateCompanyDocumentDto,
    actor: Actor,
  ) {
    await this.assertCompanyAccess(companyId, actor);
    const doc = await this.resolveWritableDocument(companyId, dto.id, dto.documentTypeId);

    if (dto.status) {
      if (dto.status === DocumentStatus.MISSING) {
        const note = (dto.missingDescription ?? doc.missingDescription ?? '').trim();
        if (!note) {
          throw new BadRequestException('Eksik durumu için açıklama zorunludur');
        }
        doc.documentStatus = DocumentStatus.MISSING;
        doc.missingDescription = note;
      } else {
        doc.documentStatus = dto.status;
        doc.missingDescription = null as unknown as undefined;
      }
    } else if (dto.missingDescription !== undefined) {
      doc.missingDescription = dto.missingDescription.trim() || undefined;
    }

    await this.companyDocumentRepository.save(doc);
    return this.getCompanyDocuments(companyId, actor);
  }

  async uploadFile(
    companyId: string,
    documentId: string | undefined,
    documentTypeId: string | undefined,
    file: Express.Multer.File | undefined,
    actor: Actor,
  ) {
    await this.assertCompanyAccess(companyId, actor);
    if (!file) throw new BadRequestException('Dosya seçilmedi');
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Yalnızca PDF, JPG veya PNG yüklenebilir');
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new BadRequestException('Dosya boyutu 10 MB sınırını aşıyor');
    }

    const doc = await this.resolveWritableDocument(companyId, documentId, documentTypeId);
    await this.deleteStoredFile(doc.filePath);

    const stored = await this.storeFile(companyId, file);
    doc.fileName = file.originalname;
    doc.filePath = stored;
    doc.uploadedBy = actor.id;
    doc.uploadedAt = new Date();
    if (doc.documentStatus !== DocumentStatus.MISSING) {
      doc.documentStatus = DocumentStatus.AVAILABLE;
      doc.missingDescription = undefined;
    }
    await this.companyDocumentRepository.save(doc);
    return this.getCompanyDocuments(companyId, actor);
  }

  async deleteFile(companyId: string, documentId: string, actor: Actor) {
    await this.assertCompanyAccess(companyId, actor);
    const doc = await this.requireCompanyDocument(companyId, documentId);
    await this.deleteStoredFile(doc.filePath);
    doc.fileName = null as unknown as undefined;
    doc.filePath = null as unknown as undefined;
    doc.uploadedBy = null as unknown as undefined;
    doc.uploadedAt = null as unknown as undefined;
    if (doc.documentStatus === DocumentStatus.AVAILABLE) {
      doc.documentStatus = DocumentStatus.PENDING;
    }
    await this.companyDocumentRepository.save(doc);
    return this.getCompanyDocuments(companyId, actor);
  }

  async deleteCustomDocument(companyId: string, documentId: string, actor: Actor) {
    await this.assertCompanyAccess(companyId, actor);
    const doc = await this.requireCompanyDocument(companyId, documentId);
    if (doc.documentTypeId) {
      throw new BadRequestException('Standart belgeler silinemez');
    }
    await this.deleteStoredFile(doc.filePath);
    await this.companyDocumentRepository.remove(doc);
    return this.getCompanyDocuments(companyId, actor);
  }

  async openFile(companyId: string, documentId: string, actor: Actor) {
    await this.assertCompanyAccess(companyId, actor);
    const doc = await this.requireCompanyDocument(companyId, documentId);
    if (!doc.filePath) throw new NotFoundException('Dosya bulunamadı');
    const absolute = this.absolutePath(doc.filePath);
    return {
      stream: createReadStream(absolute),
      fileName: doc.fileName ?? 'belge',
      mime: this.mimeFromName(doc.fileName),
    };
  }

  async completeProcess(companyId: string, actor: Actor) {
    const company = await this.assertCompanyAccess(companyId, actor);
    const process = await this.ensureProcess(company);
    if (process.status === DocumentProcessStatus.COMPLETED) {
      throw new BadRequestException('Evrak süreci zaten tamamlandı');
    }

    const built = await this.buildChecklist(company);
    const blocking = built.standard.filter(
      (item) => item.isRequired && (item.status !== DocumentStatus.AVAILABLE || !item.fileName),
    );
    if (blocking.length) {
      const names = blocking.map((item) => item.name).join(', ');
      throw new BadRequestException(
        `Evrak süreci henüz tamamlanamaz. Eksik belgeler: ${names}`,
      );
    }

    process.status = DocumentProcessStatus.COMPLETED;
    process.completedBy = actor.id;
    process.completedAt = new Date();
    await this.processRepository.save(process);
    await this.companyRepository.update(companyId, { documentsCompleted: true });

    return this.getCompanyDocuments(companyId, actor);
  }

  private serializeType(type: DocumentType) {
    return {
      id: type.id,
      name: type.name,
      description: type.description ?? null,
      isRequired: type.isRequired,
      isActive: type.isActive,
      appliesToAll: type.appliesToAll,
      sortOrder: type.sortOrder,
      assignments: (type.assignments ?? []).map((item) => ({
        id: item.id,
        categoryId: item.customerCategoryId,
        categoryName: item.category?.name ?? '',
        isRequired: item.isRequired,
      })),
    };
  }

  private async replaceAssignments(typeId: string, assignments: DocumentTypeAssignmentInputDto[]) {
    const uniqueIds = [...new Set(assignments.map((item) => item.categoryId))];
    const categories = await this.categoryRepository.find({
      where: { id: In(uniqueIds) },
    });
    if (categories.length !== uniqueIds.length) {
      throw new BadRequestException('Geçersiz ana kategori seçildi');
    }

    await this.assignmentRepository.delete({ documentTypeId: typeId });
    await this.assignmentRepository.save(
      assignments.map((item) =>
        this.assignmentRepository.create({
          documentTypeId: typeId,
          customerCategoryId: item.categoryId,
          isRequired: item.isRequired,
        }),
      ),
    );
  }

  private async buildChecklist(company: Company) {
    const [globalTypes, assignments] = await Promise.all([
      this.typeRepository.find({
        where: { appliesToAll: true, isActive: true },
        order: { sortOrder: 'ASC', name: 'ASC' },
      }),
      company.categoryId
        ? this.assignmentRepository.find({
            where: { customerCategoryId: company.categoryId },
            relations: ['documentType'],
          })
        : Promise.resolve([]),
    ]);

    const existing = await this.companyDocumentRepository.find({
      where: { companyId: company.id },
    });
    const byType = new Map(
      existing.filter((row) => row.documentTypeId).map((row) => [row.documentTypeId as string, row]),
    );

    const merged = new Map<
      string,
      { name: string; isRequired: boolean; description?: string; sortOrder: number }
    >();

    for (const type of globalTypes) {
      merged.set(type.id, {
        name: type.name,
        isRequired: type.isRequired,
        description: type.description,
        sortOrder: type.sortOrder,
      });
    }

    for (const row of assignments) {
      if (!row.documentType?.isActive || merged.has(row.documentTypeId)) continue;
      merged.set(row.documentTypeId, {
        name: row.documentType.name,
        isRequired: row.isRequired,
        description: row.documentType.description,
        sortOrder: row.documentType.sortOrder,
      });
    }

    const standard = [...merged.entries()]
      .sort((a, b) => a[1].sortOrder - b[1].sortOrder || a[1].name.localeCompare(b[1].name, 'tr'))
      .map(([documentTypeId, meta]) =>
        this.serializeCompanyDoc(
          byType.get(documentTypeId),
          meta.name,
          true,
          meta.isRequired,
          documentTypeId,
          meta.description,
        ),
      );

    const custom = existing
      .filter((row) => !row.documentTypeId)
      .map((row) => this.serializeCompanyDoc(row, row.customDocumentName ?? 'Ek Belge', false, false));

    return { standard, custom };
  }

  private serializeCompanyDoc(
    doc: CompanyDocument | undefined,
    name: string,
    isStandard: boolean,
    isRequired: boolean,
    documentTypeId?: string,
    description?: string,
  ) {
    return {
      id: doc?.id ?? null,
      documentTypeId: documentTypeId ?? doc?.documentTypeId ?? null,
      name,
      description: description ?? null,
      isStandard,
      isRequired,
      status: doc?.documentStatus ?? DocumentStatus.PENDING,
      fileName: doc?.fileName ?? null,
      missingDescription: doc?.missingDescription ?? null,
      uploadedAt: doc?.uploadedAt ?? null,
    };
  }

  private summarize(
    standard: ReturnType<DocumentsService['serializeCompanyDoc']>[],
    custom: ReturnType<DocumentsService['serializeCompanyDoc']>[],
  ) {
    const all = [...standard, ...custom];
    return {
      totalCount: all.length,
      availableCount: all.filter((item) => item.status === DocumentStatus.AVAILABLE).length,
      requiredBlockingCount: standard.filter(
        (item) => item.isRequired && (item.status !== DocumentStatus.AVAILABLE || !item.fileName),
      ).length,
    };
  }

  private async assertCompanyAccess(companyId: string, actor: Actor) {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['category', 'subcategory'],
    });
    if (!company || company.deletedAt) {
      throw new NotFoundException('Firma bulunamadı');
    }
    if (actor.role === Role.DEALER) {
      if (company.dealerCompanyId !== actor.companyId) {
        throw new ForbiddenException('Bu firmaya erişim yetkiniz yok');
      }
    } else if (actor.role === Role.ADMIN) {
      const isOwnScope = company.isDealer || !company.dealerCompanyId;
      if (!isOwnScope || company.companyCode === 'ADMIN') {
        throw new ForbiddenException('Bu firmaya erişim yetkiniz yok');
      }
    } else {
      throw new ForbiddenException('Bu firmaya erişim yetkiniz yok');
    }
    return company;
  }

  private async ensureProcess(company: Company) {
    let process = await this.processRepository.findOne({ where: { companyId: company.id } });
    if (!process) {
      process = await this.processRepository.save(
        this.processRepository.create({
          companyId: company.id,
          status: company.documentsCompleted
            ? DocumentProcessStatus.COMPLETED
            : DocumentProcessStatus.IN_PROGRESS,
          completedAt: company.documentsCompleted ? new Date() : undefined,
        }),
      );
    }
    return process;
  }

  private async ensureProcessById(companyId: string) {
    const company = await this.companyRepository.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Firma bulunamadı');
    return this.ensureProcess(company);
  }

  private async requireCompanyDocument(companyId: string, documentId: string) {
    const doc = await this.companyDocumentRepository.findOne({
      where: { id: documentId, companyId },
    });
    if (!doc) throw new NotFoundException('Belge bulunamadı');
    return doc;
  }

  private async resolveWritableDocument(
    companyId: string,
    documentId?: string,
    documentTypeId?: string,
  ) {
    if (documentId) {
      return this.requireCompanyDocument(companyId, documentId);
    }
    if (!documentTypeId) {
      throw new BadRequestException('Belge seçilmedi');
    }
    const existing = await this.companyDocumentRepository.findOne({
      where: { companyId, documentTypeId },
    });
    if (existing) return existing;

    const type = await this.typeRepository.findOne({ where: { id: documentTypeId, isActive: true } });
    if (!type) throw new NotFoundException('Belge türü bulunamadı');

    return this.companyDocumentRepository.save(
      this.companyDocumentRepository.create({
        companyId,
        documentTypeId,
        documentStatus: DocumentStatus.PENDING,
      }),
    );
  }

  private async storeFile(companyId: string, file: Express.Multer.File) {
    const dir = join(process.cwd(), 'uploads', 'company-documents', companyId);
    await mkdir(dir, { recursive: true });
    const extension = extname(file.originalname || '').toLowerCase() || this.extFromMime(file.mimetype);
    const filename = `${randomUUID()}${extension}`;
    await writeFile(join(dir, filename), file.buffer);
    return join('uploads', 'company-documents', companyId, filename);
  }

  private absolutePath(relative: string) {
    return join(process.cwd(), relative);
  }

  private async deleteStoredFile(relative?: string) {
    if (!relative) return;
    try {
      await unlink(this.absolutePath(relative));
    } catch {
      // already gone
    }
  }

  private extFromMime(mime: string) {
    if (mime === 'application/pdf') return '.pdf';
    if (mime === 'image/png') return '.png';
    return '.jpg';
  }

  private mimeFromName(name?: string) {
    const lower = (name ?? '').toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    return 'application/octet-stream';
  }
}
