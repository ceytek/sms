import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KvkkTextDocument } from '../entities/kvkk-text-document.entity.js';
import { KvkkTextVersion } from '../entities/kvkk-text-version.entity.js';
import { CreateKvkkTextDto, PublishKvkkTextVersionDto, UpdateKvkkTextDocumentDto } from '../dto/text.dto.js';
import { KvkkAccessService, type KvkkActor } from './kvkk-access.service.js';
import { toTextDocumentDto } from './kvkk-presenter.js';

@Injectable()
export class KvkkTextsService {
  constructor(
    @InjectRepository(KvkkTextDocument)
    private readonly documentRepository: Repository<KvkkTextDocument>,
    @InjectRepository(KvkkTextVersion)
    private readonly versionRepository: Repository<KvkkTextVersion>,
    private readonly access: KvkkAccessService,
  ) {}

  async list(actor: KvkkActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const documents = await this.documentRepository.find({
      where: { ownerCompanyId },
      order: { createdAt: 'DESC' },
      relations: ['versions'],
    });
    return documents.map((item) => toTextDocumentDto(item, item.versions ?? []));
  }

  async create(dto: CreateKvkkTextDto, actor: KvkkActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const document = await this.documentRepository.save(
      this.documentRepository.create({
        ownerCompanyId,
        name: dto.name.trim(),
        createdBy: actor.id,
      }),
    );
    await this.versionRepository.save(
      this.versionRepository.create({
        documentId: document.id,
        version: 1,
        title: dto.title.trim(),
        bodyHtml: dto.bodyHtml,
        isCurrent: true,
        createdBy: actor.id,
      }),
    );
    return this.getOne(document.id, actor);
  }

  async updateDocument(id: string, dto: UpdateKvkkTextDocumentDto, actor: KvkkActor) {
    const document = await this.requireDocument(id, actor);
    if (dto.name) document.name = dto.name.trim();
    await this.documentRepository.save(document);
    return this.getOne(id, actor);
  }

  async publishVersion(id: string, dto: PublishKvkkTextVersionDto, actor: KvkkActor) {
    const document = await this.requireDocument(id, actor);
    const latest = await this.versionRepository.findOne({
      where: { documentId: document.id },
      order: { version: 'DESC' },
    });
    await this.versionRepository.update({ documentId: document.id, isCurrent: true }, { isCurrent: false });
    await this.versionRepository.save(
      this.versionRepository.create({
        documentId: document.id,
        version: (latest?.version ?? 0) + 1,
        title: dto.title.trim(),
        bodyHtml: dto.bodyHtml,
        isCurrent: true,
        createdBy: actor.id,
      }),
    );
    return this.getOne(id, actor);
  }

  async getOne(id: string, actor: KvkkActor) {
    const document = await this.requireDocument(id, actor);
    const versions = await this.versionRepository.find({
      where: { documentId: document.id },
      order: { version: 'DESC' },
    });
    return toTextDocumentDto(document, versions);
  }

  async currentVersion(ownerCompanyId: string, documentId: string) {
    const document = await this.documentRepository.findOne({ where: { id: documentId, ownerCompanyId } });
    if (!document) throw new NotFoundException('KVKK metni bulunamadı');
    const current = await this.versionRepository.findOne({
      where: { documentId, isCurrent: true },
    });
    if (!current) throw new NotFoundException('Yayınlanmış metin versiyonu yok');
    return current;
  }

  private async requireDocument(id: string, actor: KvkkActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const document = await this.documentRepository.findOne({ where: { id, ownerCompanyId } });
    if (!document) throw new NotFoundException('KVKK metni bulunamadı');
    return document;
  }
}
