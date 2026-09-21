import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyOriginator } from '../companies/entities/company-originator.entity.js';
import { OriginatorBlockedNumber } from './entities/originator-blocked-number.entity.js';
import {
  BulkOriginatorRestrictionDto,
  CreateOriginatorRestrictionDto,
  OriginatorRestrictionQueryDto,
} from './dto/originator-restriction.dto.js';
import { OriginatorRestrictionType } from '../../common/enums/originator-restriction-type.enum.js';
import { OriginatorStatus } from '../../common/enums/originator-status.enum.js';
import { formatTrMobile, normalizeTrMobile } from '../../common/phone/normalize-tr-mobile.js';

type Actor = { id: string; companyId?: string };

@Injectable()
export class OriginatorRestrictionsService {
  constructor(
    @InjectRepository(OriginatorBlockedNumber)
    private readonly restrictionRepository: Repository<OriginatorBlockedNumber>,
    @InjectRepository(CompanyOriginator)
    private readonly originatorRepository: Repository<CompanyOriginator>,
  ) {}

  async listOriginators(actor: Actor) {
    const ownerCompanyId = this.ownerCompanyId(actor);
    const items = await this.originatorRepository.find({
      where: { companyId: ownerCompanyId, status: OriginatorStatus.ACTIVE },
      relations: ['smsAccount', 'smsAccount.provider'],
      order: { name: 'ASC' },
    });
    return items.map((item) => this.toOriginatorDto(item));
  }

  async list(query: OriginatorRestrictionQueryDto, actor: Actor) {
    const ownerCompanyId = this.ownerCompanyId(actor);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.restrictionRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.originator', 'originator')
      .leftJoinAndSelect('originator.smsAccount', 'smsAccount')
      .leftJoinAndSelect('smsAccount.provider', 'provider')
      .where('item.ownerCompanyId = :ownerCompanyId', { ownerCompanyId })
      .andWhere('item.restrictionType = :type', { type: query.type });

    if (query.originatorId) {
      await this.requireOwnedOriginator(ownerCompanyId, query.originatorId);
      qb.andWhere('item.originatorId = :originatorId', { originatorId: query.originatorId });
    }
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(item.normalizedPhone ILIKE :search OR item.mobilePhone ILIKE :search OR item.firstName ILIKE :search OR item.lastName ILIKE :search OR originator.name ILIKE :search)',
        { search },
      );
    }

    const [items, total] = await qb
      .orderBy('item.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((item) => this.toRestrictionDto(item)),
      total,
      page,
      limit,
    };
  }

  async create(dto: CreateOriginatorRestrictionDto, actor: Actor) {
    const ownerCompanyId = this.ownerCompanyId(actor);
    const originator = await this.requireActiveOriginator(ownerCompanyId, dto.originatorId);
    const normalized = this.requireNormalized(dto.mobilePhone);
    const saved = await this.upsertRestriction({
      ownerCompanyId,
      originator,
      normalized,
      mobilePhone: dto.mobilePhone.trim(),
      type: dto.type,
      firstName: dto.firstName,
      lastName: dto.lastName,
      notes: dto.notes,
      actorId: actor.id,
    });
    return this.toRestrictionDto(await this.requireById(ownerCompanyId, saved.id));
  }

  async createBulk(dto: BulkOriginatorRestrictionDto, actor: Actor) {
    const ownerCompanyId = this.ownerCompanyId(actor);
    const originator = await this.requireActiveOriginator(ownerCompanyId, dto.originatorId);
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const raw of dto.numbers) {
      const normalized = normalizeTrMobile(raw);
      if (!normalized) {
        skipped += 1;
        errors.push(`${raw}: geçersiz numara`);
        continue;
      }
      await this.upsertRestriction({
        ownerCompanyId,
        originator,
        normalized,
        mobilePhone: raw.trim(),
        type: dto.type,
        actorId: actor.id,
      });
      created += 1;
    }

    return { created, skipped, errors };
  }

  async remove(id: string, actor: Actor) {
    const ownerCompanyId = this.ownerCompanyId(actor);
    const item = await this.requireById(ownerCompanyId, id);
    await this.restrictionRepository.softRemove(item);
    return { id };
  }

  async isBlocked(ownerCompanyId: string, originatorId: string, rawPhone: string) {
    const normalized = normalizeTrMobile(rawPhone);
    if (!normalized) return false;
    const row = await this.restrictionRepository.findOne({
      where: { ownerCompanyId, originatorId, normalizedPhone: normalized },
    });
    return Boolean(row);
  }

  private async upsertRestriction(input: {
    ownerCompanyId: string;
    originator: CompanyOriginator;
    normalized: string;
    mobilePhone: string;
    type: OriginatorRestrictionType;
    firstName?: string;
    lastName?: string;
    notes?: string;
    actorId: string;
  }) {
    const existing = await this.restrictionRepository.findOne({
      where: { originatorId: input.originator.id, normalizedPhone: input.normalized },
    });
    if (existing) {
      existing.restrictionType = input.type;
      existing.mobilePhone = input.mobilePhone;
      if (input.firstName?.trim()) existing.firstName = input.firstName.trim();
      if (input.lastName?.trim()) existing.lastName = input.lastName.trim();
      if (input.notes?.trim()) existing.notes = input.notes.trim();
      existing.updatedBy = input.actorId;
      return this.restrictionRepository.save(existing);
    }
    return this.restrictionRepository.save(
      this.restrictionRepository.create({
        ownerCompanyId: input.ownerCompanyId,
        originatorId: input.originator.id,
        restrictionType: input.type,
        mobilePhone: input.mobilePhone,
        normalizedPhone: input.normalized,
        firstName: input.firstName?.trim() || undefined,
        lastName: input.lastName?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        createdBy: input.actorId,
        updatedBy: input.actorId,
      }),
    );
  }

  private ownerCompanyId(actor: Actor) {
    if (!actor.companyId) {
      throw new ForbiddenException('Firma bilgisi bulunamadı');
    }
    return actor.companyId;
  }

  private async requireOwnedOriginator(ownerCompanyId: string, originatorId: string) {
    const originator = await this.originatorRepository.findOne({
      where: { id: originatorId, companyId: ownerCompanyId },
      relations: ['smsAccount', 'smsAccount.provider'],
    });
    if (!originator) {
      throw new BadRequestException('Originatör bu firmaya ait değil');
    }
    return originator;
  }

  private async requireActiveOriginator(ownerCompanyId: string, originatorId: string) {
    const originator = await this.requireOwnedOriginator(ownerCompanyId, originatorId);
    if (originator.status !== OriginatorStatus.ACTIVE) {
      throw new BadRequestException('Yalnızca aktif originatörlere numara eklenebilir');
    }
    return originator;
  }

  private async requireById(ownerCompanyId: string, id: string) {
    const item = await this.restrictionRepository.findOne({
      where: { id, ownerCompanyId },
      relations: ['originator', 'originator.smsAccount', 'originator.smsAccount.provider'],
    });
    if (!item) {
      throw new NotFoundException('Kayıt bulunamadı');
    }
    return item;
  }

  private requireNormalized(raw: string) {
    const normalized = normalizeTrMobile(raw);
    if (!normalized) {
      throw new BadRequestException('Geçerli bir cep telefonu girin');
    }
    return normalized;
  }

  private toOriginatorDto(item: CompanyOriginator) {
    return {
      id: item.id,
      name: item.name,
      status: item.status,
      providerName: item.smsAccount?.provider?.name ?? null,
    };
  }

  private toRestrictionDto(item: OriginatorBlockedNumber) {
    return {
      id: item.id,
      originatorId: item.originatorId,
      originatorName: item.originator?.name ?? '',
      providerName: item.originator?.smsAccount?.provider?.name ?? null,
      restrictionType: item.restrictionType,
      mobilePhone: item.mobilePhone,
      formattedPhone: formatTrMobile(item.normalizedPhone),
      firstName: item.firstName ?? '',
      lastName: item.lastName ?? '',
      notes: item.notes ?? '',
      createdAt: item.createdAt,
    };
  }
}
