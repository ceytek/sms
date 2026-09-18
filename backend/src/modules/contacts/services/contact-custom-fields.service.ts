import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactCustomField } from '../entities/contact-custom-field.entity.js';
import { CreateContactCustomFieldDto, UpdateContactCustomFieldDto } from '../dto/custom-field.dto.js';
import { ContactAccessService, type ContactActor } from './contact-access.service.js';
import { ContactCustomFieldType } from '../../../common/enums/contact-custom-field-type.enum.js';
import { toCustomFieldDto } from './contact-presenter.js';

export const MAX_CONTACT_CUSTOM_FIELDS = 7;

@Injectable()
export class ContactCustomFieldsService {
  constructor(
    @InjectRepository(ContactCustomField)
    private readonly fieldRepository: Repository<ContactCustomField>,
    private readonly access: ContactAccessService,
  ) {}

  async list(actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const fields = await this.fieldRepository.find({
      where: { ownerCompanyId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    return fields.map((item) => toCustomFieldDto(item));
  }

  async listActive(ownerCompanyId: string) {
    return this.fieldRepository.find({
      where: { ownerCompanyId, isActive: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async create(dto: CreateContactCustomFieldDto, actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const count = await this.fieldRepository.count({ where: { ownerCompanyId } });
    if (count >= MAX_CONTACT_CUSTOM_FIELDS) {
      throw new BadRequestException(`En fazla ${MAX_CONTACT_CUSTOM_FIELDS} özel alan eklenebilir`);
    }
    await this.ensureNameFree(ownerCompanyId, dto.name.trim());
    const field = this.fieldRepository.create({
      ownerCompanyId,
      name: dto.name.trim(),
      fieldType: dto.fieldType ?? ContactCustomFieldType.TEXT,
      isActive: dto.isActive ?? true,
      sortOrder: count,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    return toCustomFieldDto(await this.fieldRepository.save(field));
  }

  async update(id: string, dto: UpdateContactCustomFieldDto, actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const field = await this.requireField(ownerCompanyId, id);
    if (dto.name && dto.name.trim() !== field.name) {
      await this.ensureNameFree(ownerCompanyId, dto.name.trim(), id);
      field.name = dto.name.trim();
    }
    if (dto.fieldType !== undefined) field.fieldType = dto.fieldType;
    if (dto.isActive !== undefined) field.isActive = dto.isActive;
    field.updatedBy = actor.id;
    return toCustomFieldDto(await this.fieldRepository.save(field));
  }

  async remove(id: string, actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const field = await this.requireField(ownerCompanyId, id);
    await this.fieldRepository.softRemove(field);
    return { id };
  }

  async sanitizeValues(ownerCompanyId: string, values?: Record<string, string>) {
    return this.filterValues(await this.listActive(ownerCompanyId), values);
  }

  filterValues(fields: ContactCustomField[], values?: Record<string, string>) {
    if (!values) return undefined;
    const allowed = new Map(fields.map((item) => [item.id, item]));
    const next: Record<string, string> = {};
    for (const [id, raw] of Object.entries(values)) {
      const field = allowed.get(id);
      if (!field) continue;
      const value = String(raw ?? '').trim().slice(0, 255);
      if (!value) continue;
      if (field.fieldType === ContactCustomFieldType.NUMBER) {
        const numeric = Number(value.replace(',', '.'));
        if (!Number.isFinite(numeric)) continue;
      }
      next[id] = value;
    }
    return Object.keys(next).length ? next : undefined;
  }

  private async requireField(ownerCompanyId: string, id: string) {
    const field = await this.fieldRepository.findOne({ where: { id, ownerCompanyId } });
    if (!field) throw new NotFoundException('Özel alan bulunamadı');
    return field;
  }

  private async ensureNameFree(ownerCompanyId: string, name: string, exceptId?: string) {
    const qb = this.fieldRepository
      .createQueryBuilder('field')
      .where('field.owner_company_id = :ownerCompanyId', { ownerCompanyId })
      .andWhere('field.deleted_at IS NULL')
      .andWhere('LOWER(field.name) = LOWER(:name)', { name });
    if (exceptId) qb.andWhere('field.id != :exceptId', { exceptId });
    const existing = await qb.getOne();
    if (existing) throw new BadRequestException('Bu özel alan adı zaten kullanılıyor');
  }
}
