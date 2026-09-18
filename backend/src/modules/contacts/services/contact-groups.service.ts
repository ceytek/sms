import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ContactGroup } from '../entities/contact-group.entity.js';
import { ContactGroupMember } from '../entities/contact-group-member.entity.js';
import { CreateContactGroupDto, UpdateContactGroupDto } from '../dto/group-tag.dto.js';
import { ContactAccessService, type ContactActor } from './contact-access.service.js';
import { toGroupDto } from './contact-presenter.js';

@Injectable()
export class ContactGroupsService {
  constructor(
    @InjectRepository(ContactGroup)
    private readonly groupRepository: Repository<ContactGroup>,
    @InjectRepository(ContactGroupMember)
    private readonly memberRepository: Repository<ContactGroupMember>,
    private readonly access: ContactAccessService,
  ) {}

  async list(actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const groups = await this.groupRepository.find({
      where: { ownerCompanyId },
      order: { name: 'ASC' },
    });
    const counts = await this.memberCounts(groups.map((item) => item.id));
    return groups.map((item) => toGroupDto(item, counts.get(item.id) ?? 0));
  }

  async create(dto: CreateContactGroupDto, actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    await this.ensureNameFree(ownerCompanyId, dto.name.trim());
    if (dto.parentId) {
      await this.requireGroup(ownerCompanyId, dto.parentId);
    }
    const group = this.groupRepository.create({
      ownerCompanyId,
      name: dto.name.trim(),
      description: dto.description?.trim() || undefined,
      parentId: dto.parentId,
      isActive: dto.isActive ?? true,
      createdBy: actor.id,
      updatedBy: actor.id,
    });
    const saved = await this.groupRepository.save(group);
    return toGroupDto(saved, 0);
  }

  async update(id: string, dto: UpdateContactGroupDto, actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const group = await this.requireGroup(ownerCompanyId, id);
    if (dto.name && dto.name.trim() !== group.name) {
      await this.ensureNameFree(ownerCompanyId, dto.name.trim(), id);
      group.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      group.description = dto.description.trim() || undefined;
    }
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('Grup kendisinin alt grubu olamaz');
      }
      if (dto.parentId) {
        await this.requireGroup(ownerCompanyId, dto.parentId);
      }
      group.parentId = dto.parentId || undefined;
    }
    if (dto.isActive !== undefined) {
      group.isActive = dto.isActive;
    }
    group.updatedBy = actor.id;
    const saved = await this.groupRepository.save(group);
    const count = await this.memberRepository.count({ where: { groupId: saved.id } });
    return toGroupDto(saved, count);
  }

  async remove(id: string, actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const group = await this.requireGroup(ownerCompanyId, id);
    await this.groupRepository.softRemove(group);
    return { id };
  }

  async requireGroup(ownerCompanyId: string, id: string) {
    const group = await this.groupRepository.findOne({ where: { id, ownerCompanyId } });
    if (!group) throw new NotFoundException('Grup bulunamadı');
    return group;
  }

  async requireGroups(ownerCompanyId: string, ids: string[]) {
    if (!ids.length) return [];
    const groups = await this.groupRepository.find({ where: { id: In(ids), ownerCompanyId } });
    if (groups.length !== ids.length) {
      throw new BadRequestException('Geçersiz grup seçimi');
    }
    return groups;
  }

  async findOrCreate(ownerCompanyId: string, name: string, actorId: string) {
    const trimmed = name.trim();
    const existing = await this.groupRepository
      .createQueryBuilder('group')
      .where('group.owner_company_id = :ownerCompanyId', { ownerCompanyId })
      .andWhere('group.deleted_at IS NULL')
      .andWhere('LOWER(group.name) = LOWER(:name)', { name: trimmed })
      .getOne();
    if (existing) return existing;
    return this.groupRepository.save(
      this.groupRepository.create({
        ownerCompanyId,
        name: trimmed,
        isActive: true,
        createdBy: actorId,
        updatedBy: actorId,
      }),
    );
  }

  private async ensureNameFree(ownerCompanyId: string, name: string, exceptId?: string) {
    const qb = this.groupRepository
      .createQueryBuilder('group')
      .where('group.owner_company_id = :ownerCompanyId', { ownerCompanyId })
      .andWhere('group.deleted_at IS NULL')
      .andWhere('LOWER(group.name) = LOWER(:name)', { name });
    if (exceptId) qb.andWhere('group.id != :exceptId', { exceptId });
    const existing = await qb.getOne();
    if (existing) throw new BadRequestException('Bu grup adı zaten kullanılıyor');
  }

  private async memberCounts(groupIds: string[]) {
    const map = new Map<string, number>();
    if (!groupIds.length) return map;
    const rows = await this.memberRepository
      .createQueryBuilder('member')
      .select('member.group_id', 'groupId')
      .addSelect('COUNT(*)', 'count')
      .where('member.group_id IN (:...groupIds)', { groupIds })
      .groupBy('member.group_id')
      .getRawMany<{ groupId: string; count: string }>();
    for (const row of rows) map.set(row.groupId, Number(row.count));
    return map;
  }
}
