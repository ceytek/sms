import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Contact } from '../entities/contact.entity.js';
import { ContactGroupMember } from '../entities/contact-group-member.entity.js';
import { ContactTagMember } from '../entities/contact-tag-member.entity.js';
import { ContactGroup } from '../entities/contact-group.entity.js';
import { ContactTag } from '../entities/contact-tag.entity.js';
import { CreateContactDto, RestrictContactDto, UpdateContactDto } from '../dto/contact.dto.js';
import { ContactExportQueryDto, ContactQueryDto } from '../dto/contact-query.dto.js';
import { ContactBulkActionDto } from '../dto/import.dto.js';
import { ContactAccessService, type ContactActor } from './contact-access.service.js';
import { ContactGroupsService } from './contact-groups.service.js';
import { ContactTagsService } from './contact-tags.service.js';
import { ContactCustomFieldsService } from './contact-custom-fields.service.js';
import { toContactDto } from './contact-presenter.js';
import { ContactSource } from '../../../common/enums/contact-source.enum.js';
import { ContactStatus } from '../../../common/enums/contact-status.enum.js';
import { ContactBulkAction } from '../../../common/enums/contact-bulk-action.enum.js';
import { normalizeTrMobile } from '../../../common/phone/normalize-tr-mobile.js';
import * as XLSX from 'xlsx';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(ContactGroup)
    private readonly groupRepository: Repository<ContactGroup>,
    @InjectRepository(ContactTag)
    private readonly tagRepository: Repository<ContactTag>,
    @InjectRepository(ContactGroupMember)
    private readonly groupMemberRepository: Repository<ContactGroupMember>,
    @InjectRepository(ContactTagMember)
    private readonly tagMemberRepository: Repository<ContactTagMember>,
    private readonly access: ContactAccessService,
    private readonly groupsService: ContactGroupsService,
    private readonly tagsService: ContactTagsService,
    private readonly customFieldsService: ContactCustomFieldsService,
  ) {}

  async summary(actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const [total, active, blacklist, smsBlocked, groupCount, canImportFromCompanies] = await Promise.all([
      this.contactRepository.count({ where: { ownerCompanyId } }),
      this.contactRepository.count({ where: { ownerCompanyId, status: ContactStatus.ACTIVE } }),
      this.contactRepository.count({ where: { ownerCompanyId, status: ContactStatus.BLACKLIST } }),
      this.contactRepository.count({ where: { ownerCompanyId, status: ContactStatus.SMS_BLOCKED } }),
      this.groupRepository.count({ where: { ownerCompanyId, isActive: true } }),
      this.access.companyImportActor(actor).then((scope) => Boolean(scope)),
    ]);
    return {
      total,
      active,
      blacklist,
      smsBlocked,
      blocked: blacklist + smsBlocked,
      groupCount,
      canImportFromCompanies,
    };
  }

  async list(query: ContactQueryDto, actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.buildListQuery(ownerCompanyId, query);
    const [items, total] = await qb
      .orderBy('contact.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const decorated = await this.decorate(items);
    return { items: decorated, total, page, limit };
  }

  async getOne(id: string, actor: ContactActor) {
    const contact = await this.requireContact(this.access.ownerCompanyId(actor), id);
    const [decorated] = await this.decorate([contact]);
    return decorated;
  }

  async create(dto: CreateContactDto, actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const normalized = this.requireNormalized(dto.mobilePhone);
    await this.ensurePhoneFree(ownerCompanyId, normalized);
    const groupIds = dto.groupIds ?? [];
    const tagIds = dto.tagIds ?? [];
    await this.groupsService.requireGroups(ownerCompanyId, groupIds);
    await this.tagsService.requireTags(ownerCompanyId, tagIds);
    const customFields = await this.customFieldsService.sanitizeValues(ownerCompanyId, dto.customFields);
    const contact = await this.contactRepository.save(
      this.contactRepository.create({
        ownerCompanyId,
        firstName: dto.firstName?.trim() || undefined,
        lastName: dto.lastName?.trim() || undefined,
        mobilePhone: dto.mobilePhone.trim(),
        normalizedPhone: normalized,
        email: dto.email?.trim() || undefined,
        companyName: dto.companyName?.trim() || undefined,
        notes: dto.notes?.trim() || undefined,
        customFields,
        status: dto.status ?? ContactStatus.ACTIVE,
        source: ContactSource.MANUAL,
        createdBy: actor.id,
        updatedBy: actor.id,
      }),
    );
    await this.replaceMemberships(contact.id, groupIds, tagIds);
    const [decorated] = await this.decorate([contact]);
    return decorated;
  }

  async restrict(dto: RestrictContactDto, actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const normalized = this.requireNormalized(dto.mobilePhone);
    const existing = await this.findByNormalized(ownerCompanyId, normalized);
    if (existing) {
      existing.status = dto.status;
      if (dto.firstName?.trim()) existing.firstName = dto.firstName.trim();
      if (dto.lastName?.trim()) existing.lastName = dto.lastName.trim();
      if (dto.notes?.trim()) existing.notes = dto.notes.trim();
      existing.updatedBy = actor.id;
      await this.contactRepository.save(existing);
      return this.getOne(existing.id, actor);
    }
    const contact = await this.contactRepository.save(
      this.contactRepository.create({
        ownerCompanyId,
        firstName: dto.firstName?.trim() || undefined,
        lastName: dto.lastName?.trim() || undefined,
        mobilePhone: dto.mobilePhone.trim(),
        normalizedPhone: normalized,
        notes: dto.notes?.trim() || undefined,
        status: dto.status,
        source: ContactSource.MANUAL,
        createdBy: actor.id,
        updatedBy: actor.id,
      }),
    );
    const [decorated] = await this.decorate([contact]);
    return decorated;
  }

  async update(id: string, dto: UpdateContactDto, actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const contact = await this.requireContact(ownerCompanyId, id);
    if (dto.mobilePhone) {
      const normalized = this.requireNormalized(dto.mobilePhone);
      await this.ensurePhoneFree(ownerCompanyId, normalized, id);
      contact.mobilePhone = dto.mobilePhone.trim();
      contact.normalizedPhone = normalized;
    }
    if (dto.firstName !== undefined) contact.firstName = dto.firstName.trim() || undefined;
    if (dto.lastName !== undefined) contact.lastName = dto.lastName.trim() || undefined;
    if (dto.email !== undefined) contact.email = dto.email.trim() || undefined;
    if (dto.companyName !== undefined) contact.companyName = dto.companyName.trim() || undefined;
    if (dto.notes !== undefined) contact.notes = dto.notes.trim() || undefined;
    if (dto.customFields !== undefined) {
      contact.customFields = await this.customFieldsService.sanitizeValues(ownerCompanyId, dto.customFields);
    }
    if (dto.status !== undefined) contact.status = dto.status;
    contact.updatedBy = actor.id;
    if (dto.groupIds) await this.groupsService.requireGroups(ownerCompanyId, dto.groupIds);
    if (dto.tagIds) await this.tagsService.requireTags(ownerCompanyId, dto.tagIds);
    await this.contactRepository.save(contact);
    if (dto.groupIds || dto.tagIds) {
      const groupIds = dto.groupIds ?? (await this.currentGroupIds(id));
      const tagIds = dto.tagIds ?? (await this.currentTagIds(id));
      await this.replaceMemberships(id, groupIds, tagIds);
    }
    return this.getOne(id, actor);
  }

  async remove(id: string, actor: ContactActor) {
    const contact = await this.requireContact(this.access.ownerCompanyId(actor), id);
    await this.contactRepository.softRemove(contact);
    return { id };
  }

  async bulkAction(dto: ContactBulkActionDto, actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const contacts = await this.contactRepository.find({
      where: { id: In(dto.ids), ownerCompanyId },
    });
    if (contacts.length !== dto.ids.length) {
      throw new BadRequestException('Seçilen kişilerden bazıları bulunamadı');
    }
    const ids = contacts.map((item) => item.id);

    if (dto.action === ContactBulkAction.ADD_TO_GROUP || dto.action === ContactBulkAction.REMOVE_FROM_GROUP) {
      if (!dto.groupId) throw new BadRequestException('Grup seçin');
      await this.groupsService.requireGroup(ownerCompanyId, dto.groupId);
    }
    if (dto.action === ContactBulkAction.ADD_TAG || dto.action === ContactBulkAction.REMOVE_TAG) {
      if (!dto.tagId) throw new BadRequestException('Etiket seçin');
      await this.tagsService.requireTag(ownerCompanyId, dto.tagId);
    }

    switch (dto.action) {
      case ContactBulkAction.ADD_TO_GROUP:
        await this.addGroupMembers(ids, dto.groupId!);
        break;
      case ContactBulkAction.REMOVE_FROM_GROUP:
        await this.groupMemberRepository.delete({ groupId: dto.groupId, contactId: In(ids) });
        break;
      case ContactBulkAction.ADD_TAG:
        await this.addTagMembers(ids, dto.tagId!);
        break;
      case ContactBulkAction.REMOVE_TAG:
        await this.tagMemberRepository.delete({ tagId: dto.tagId, contactId: In(ids) });
        break;
      case ContactBulkAction.ACTIVATE:
        await this.contactRepository.update({ id: In(ids) }, { status: ContactStatus.ACTIVE, updatedBy: actor.id });
        break;
      case ContactBulkAction.DEACTIVATE:
        await this.contactRepository.update({ id: In(ids) }, { status: ContactStatus.PASSIVE, updatedBy: actor.id });
        break;
      case ContactBulkAction.BLACKLIST:
        await this.contactRepository.update({ id: In(ids) }, { status: ContactStatus.BLACKLIST, updatedBy: actor.id });
        break;
      case ContactBulkAction.SMS_BLOCK:
        await this.contactRepository.update({ id: In(ids) }, { status: ContactStatus.SMS_BLOCKED, updatedBy: actor.id });
        break;
      case ContactBulkAction.DELETE:
        await this.contactRepository.softDelete(ids);
        break;
      case ContactBulkAction.EXPORT:
        break;
      default:
        throw new BadRequestException('Geçersiz toplu işlem');
    }

    return { affected: ids.length };
  }

  async export(query: ContactExportQueryDto, actor: ContactActor) {
    const ownerCompanyId = this.access.ownerCompanyId(actor);
    const selectedIds = (query.ids ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const qb = this.buildListQuery(ownerCompanyId, query);
    if (selectedIds.length) {
      qb.andWhere('contact.id IN (:...selectedIds)', { selectedIds });
    }
    const contacts = await qb.orderBy('contact.created_at', 'DESC').take(20000).getMany();
    const decorated = await this.decorate(contacts);
    const customFields = await this.customFieldsService.listActive(ownerCompanyId);
    const rows = decorated.map((item) => {
      const row: Record<string, string> = {
        Ad: item.firstName,
        Soyad: item.lastName,
        Telefon: item.formattedPhone,
        Eposta: item.email,
        Firma: item.companyName,
        Gruplar: item.groups.map((group) => group.name).join(', '),
        Etiketler: item.tags.map((tag) => tag.name).join(', '),
        Kaynak: item.source,
        Durum: item.status,
      };
      for (const field of customFields) {
        row[field.name] = item.customFields?.[field.id] ?? '';
      }
      return row;
    });
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Rehber');
    const format = query.format === 'csv' ? 'csv' : 'xlsx';
    const buffer =
      format === 'csv'
        ? Buffer.from(`\uFEFF${XLSX.utils.sheet_to_csv(sheet)}`, 'utf8')
        : Buffer.from(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }));
    const filename = `rehber.${format}`;
    const contentType =
      format === 'csv'
        ? 'text/csv; charset=utf-8'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return { buffer, filename, contentType };
  }

  requireNormalized(raw: string) {
    const normalized = normalizeTrMobile(raw);
    if (!normalized) {
      throw new BadRequestException('Geçerli bir cep telefonu girin');
    }
    return normalized;
  }

  async findByNormalized(ownerCompanyId: string, normalizedPhone: string) {
    return this.contactRepository.findOne({ where: { ownerCompanyId, normalizedPhone } });
  }

  async replaceMemberships(contactId: string, groupIds: string[], tagIds: string[]) {
    await this.groupMemberRepository.delete({ contactId });
    await this.tagMemberRepository.delete({ contactId });
    if (groupIds.length) {
      await this.groupMemberRepository.save(
        groupIds.map((groupId) => this.groupMemberRepository.create({ contactId, groupId })),
      );
    }
    if (tagIds.length) {
      await this.tagMemberRepository.save(
        tagIds.map((tagId) => this.tagMemberRepository.create({ contactId, tagId })),
      );
    }
  }

  async addGroupMembers(contactIds: string[], groupId: string) {
    const existing = await this.groupMemberRepository.find({
      where: { groupId, contactId: In(contactIds) },
    });
    const have = new Set(existing.map((item) => item.contactId));
    const missing = contactIds.filter((id) => !have.has(id));
    if (!missing.length) return;
    await this.groupMemberRepository.save(
      missing.map((contactId) => this.groupMemberRepository.create({ contactId, groupId })),
    );
  }

  async addTagMembers(contactIds: string[], tagId: string) {
    const existing = await this.tagMemberRepository.find({
      where: { tagId, contactId: In(contactIds) },
    });
    const have = new Set(existing.map((item) => item.contactId));
    const missing = contactIds.filter((id) => !have.has(id));
    if (!missing.length) return;
    await this.tagMemberRepository.save(
      missing.map((contactId) => this.tagMemberRepository.create({ contactId, tagId })),
    );
  }

  private buildListQuery(ownerCompanyId: string, query: ContactQueryDto) {
    const qb = this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.owner_company_id = :ownerCompanyId', { ownerCompanyId })
      .andWhere('contact.deleted_at IS NULL');

    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        `(contact.first_name ILIKE :search OR contact.last_name ILIKE :search
          OR contact.mobile_phone ILIKE :search OR contact.normalized_phone ILIKE :search
          OR contact.company_name ILIKE :search OR contact.email ILIKE :search)`,
        { search: `%${search}%` },
      );
    }
    if (query.firstName) {
      qb.andWhere('contact.first_name ILIKE :firstName', { firstName: `%${query.firstName}%` });
    }
    if (query.lastName) {
      qb.andWhere('contact.last_name ILIKE :lastName', { lastName: `%${query.lastName}%` });
    }
    if (query.phone) {
      const digits = query.phone.replace(/\D/g, '');
      qb.andWhere(
        '(contact.mobile_phone ILIKE :phone OR contact.normalized_phone ILIKE :phoneDigits)',
        { phone: `%${query.phone}%`, phoneDigits: `%${digits}%` },
      );
    }
    if (query.companyName) {
      qb.andWhere('contact.company_name ILIKE :companyName', { companyName: `%${query.companyName}%` });
    }
    if (query.source) qb.andWhere('contact.source = :source', { source: query.source });
    if (query.status) qb.andWhere('contact.status = :status', { status: query.status });
    if (query.groupId) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM contact_group_members gm WHERE gm.contact_id = contact.id AND gm.group_id = :groupId)`,
        { groupId: query.groupId },
      );
    }
    if (query.tagId) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM contact_tag_members tm WHERE tm.contact_id = contact.id AND tm.tag_id = :tagId)`,
        { tagId: query.tagId },
      );
    }
    return qb;
  }

  private async decorate(contacts: Contact[]) {
    if (!contacts.length) return [];
    const ids = contacts.map((item) => item.id);
    const [groupMembers, tagMembers] = await Promise.all([
      this.groupMemberRepository.find({
        where: { contactId: In(ids) },
        relations: ['group'],
      }),
      this.tagMemberRepository.find({
        where: { contactId: In(ids) },
        relations: ['tag'],
      }),
    ]);
    const groupsByContact = new Map<string, { id: string; name: string }[]>();
    const tagsByContact = new Map<string, { id: string; name: string }[]>();
    for (const member of groupMembers) {
      const list = groupsByContact.get(member.contactId) ?? [];
      if (member.group) list.push({ id: member.group.id, name: member.group.name });
      groupsByContact.set(member.contactId, list);
    }
    for (const member of tagMembers) {
      const list = tagsByContact.get(member.contactId) ?? [];
      if (member.tag) list.push({ id: member.tag.id, name: member.tag.name });
      tagsByContact.set(member.contactId, list);
    }
    return contacts.map((contact) =>
      toContactDto(contact, groupsByContact.get(contact.id) ?? [], tagsByContact.get(contact.id) ?? []),
    );
  }

  private async requireContact(ownerCompanyId: string, id: string) {
    const contact = await this.contactRepository.findOne({ where: { id, ownerCompanyId } });
    if (!contact) throw new NotFoundException('Kişi bulunamadı');
    return contact;
  }

  private async ensurePhoneFree(ownerCompanyId: string, normalizedPhone: string, exceptId?: string) {
    const existing = await this.contactRepository.findOne({ where: { ownerCompanyId, normalizedPhone } });
    if (existing && existing.id !== exceptId) {
      throw new BadRequestException('Bu telefon numarası rehberde zaten kayıtlı');
    }
  }

  private async currentGroupIds(contactId: string) {
    const rows = await this.groupMemberRepository.find({ where: { contactId } });
    return rows.map((item) => item.groupId);
  }

  private async currentTagIds(contactId: string) {
    const rows = await this.tagMemberRepository.find({ where: { contactId } });
    return rows.map((item) => item.tagId);
  }
}
