import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KvkkQrCode } from '../entities/kvkk-qr-code.entity.js';
import { CreateKvkkQrDto, UpdateKvkkQrDto } from '../dto/qr.dto.js';
import { KvkkAccessService, type KvkkActor } from './kvkk-access.service.js';
import { KvkkFormsService } from './kvkk-forms.service.js';
import { toQrDto } from './kvkk-presenter.js';

@Injectable()
export class KvkkQrService {
  constructor(
    @InjectRepository(KvkkQrCode)
    private readonly qrRepository: Repository<KvkkQrCode>,
    private readonly access: KvkkAccessService,
    private readonly formsService: KvkkFormsService,
  ) {}

  async list(actor: KvkkActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const items = await this.qrRepository.find({
      where: { ownerCompanyId },
      relations: ['form'],
      order: { createdAt: 'DESC' },
    });
    return items.map((item) => toQrDto(item, this.access.publicFormUrl(item.token)));
  }

  async create(dto: CreateKvkkQrDto, actor: KvkkActor) {
    const form = await this.formsService.requireForm(dto.formId, actor);
    const qr = await this.qrRepository.save(
      this.qrRepository.create({
        ownerCompanyId: form.ownerCompanyId,
        formId: form.id,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        token: this.access.newToken(),
        isActive: dto.isActive ?? true,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        createdBy: actor.id,
      }),
    );
    qr.form = form;
    return toQrDto(qr, this.access.publicFormUrl(qr.token));
  }

  async update(id: string, dto: UpdateKvkkQrDto, actor: KvkkActor) {
    const qr = await this.requireQr(id, actor);
    if (dto.formId) {
      const form = await this.formsService.requireForm(dto.formId, actor);
      qr.formId = form.id;
    }
    if (dto.name !== undefined) qr.name = dto.name.trim();
    if (dto.description !== undefined) qr.description = dto.description.trim() || undefined;
    if (dto.isActive !== undefined) qr.isActive = dto.isActive;
    if (dto.expiresAt !== undefined) qr.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;
    await this.qrRepository.save(qr);
    return this.getOne(id, actor);
  }

  async getOne(id: string, actor: KvkkActor) {
    const qr = await this.requireQr(id, actor);
    return toQrDto(qr, this.access.publicFormUrl(qr.token));
  }

  private async requireQr(id: string, actor: KvkkActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const qr = await this.qrRepository.findOne({ where: { id, ownerCompanyId }, relations: ['form'] });
    if (!qr) throw new NotFoundException('QR kod bulunamadı');
    return qr;
  }
}
