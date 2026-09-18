import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ContactTag } from '../entities/contact-tag.entity.js';
import { ContactTagMember } from '../entities/contact-tag-member.entity.js';
import { CreateContactTagDto, UpdateContactTagDto } from '../dto/group-tag.dto.js';
import { ContactAccessService, type ContactActor } from './contact-access.service.js';
import { toTagDto } from './contact-presenter.js';

@Injectable()
export class ContactTagsService {
  constructor(
    @InjectRepository(ContactTag)
    private readonly tagRepository: Repository<ContactTag>,
    @InjectRepository(ContactTagMember)
    private readonly memberRepository: Repository<ContactTagMember>,
    private readonly access: ContactAccessService,
  ) {}

  async list(actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const tags = await this.tagRepository.find({
      where: { ownerCompanyId },
      order: { name: 'ASC' },
    });
    const counts = await this.memberCounts(tags.map((item) => item.id));
    return tags.map((item) => toTagDto(item, counts.get(item.id) ?? 0));
  }

  async create(dto: CreateContactTagDto, actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    await this.ensureNameFree(ownerCompanyId, dto.name.trim());
    const tag = this.tagRepository.create({
      ownerCompanyId,
      name: dto.name.trim(),
      isActive: dto.isActive ?? true,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    return toTagDto(await this.tagRepository.save(tag), 0);
  }

  async update(id: string, dto: UpdateContactTagDto, actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const tag = await this.requireTag(ownerCompanyId, id);
    if (dto.name && dto.name.trim() !== tag.name) {
      await this.ensureNameFree(ownerCompanyId, dto.name.trim(), id);
      tag.name = dto.name.trim();
    }
    if (dto.isActive !== undefined) tag.isActive = dto.isActive;
    tag.updatedBy = actor.id;
    const saved = await this.tagRepository.save(tag);
    const count = await this.memberRepository.count({ where: { tagId: saved.id } });
    return toTagDto(saved, count);
  }

  async remove(id: string, actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const tag = await this.requireTag(ownerCompanyId, id);
    await this.tagRepository.softRemove(tag);
    return { id };
  }

  async requireTag(ownerCompanyId: string, id: string) {
    const tag = await this.tagRepository.findOne({ where: { id, ownerCompanyId } });
    if (!tag) throw new NotFoundException('Etiket bulunamadı');
    return tag;
  }

  async requireTags(ownerCompanyId: string, ids: string[]) {
    if (!ids.length) return [];
    const tags = await this.tagRepository.find({ where: { id: In(ids), ownerCompanyId } });
    if (tags.length !== ids.length) {
      throw new BadRequestException('Geçersiz etiket seçimi');
    }
    return tags;
  }

  async findOrCreate(ownerCompanyId: string, name: string, actorId: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('Etiket adı gerekli');
    const existing = await this.tagRepository
      .createQueryBuilder('tag')
      .where('tag.owner_company_id = :ownerCompanyId', { ownerCompanyId })
      .andWhere('tag.deleted_at IS NULL')
      .andWhere('LOWER(tag.name) = LOWER(:name)', { name: trimmed })
      .getOne();
    if (existing) return existing;
    return this.tagRepository.save(
      this.tagRepository.create({
        ownerCompanyId,
        name: trimmed,
        isActive: true,
        createdBy: actorId,
        updatedBy: actorId,
      }),
    );
  }

  private async ensureNameFree(ownerCompanyId: string, name: string, exceptId?: string) {
    const qb = this.tagRepository
      .createQueryBuilder('tag')
      .where('tag.owner_company_id = :ownerCompanyId', { ownerCompanyId })
      .andWhere('tag.deleted_at IS NULL')
      .andWhere('LOWER(tag.name) = LOWER(:name)', { name });
    if (exceptId) qb.andWhere('tag.id != :exceptId', { exceptId });
    const existing = await qb.getOne();
    if (existing) throw new BadRequestException('Bu etiket adı zaten kullanılıyor');
  }

  private async memberCounts(tagIds: string[]) {
    const map = new Map<string, number>();
    if (!tagIds.length) return map;
    const rows = await this.memberRepository
      .createQueryBuilder('member')
      .select('member.tag_id', 'tagId')
      .addSelect('COUNT(*)', 'count')
      .where('member.tag_id IN (:...tagIds)', { tagIds })
      .groupBy('member.tag_id')
      .getRawMany<{ tagId: string; count: string }>();
    for (const row of rows) map.set(row.tagId, Number(row.count));
    return map;
  }
}
