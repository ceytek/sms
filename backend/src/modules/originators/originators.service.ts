import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CompanyOriginator } from '../companies/entities/company-originator.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { BannedOriginator } from './entities/banned-originator.entity.js';
import { OriginatorStatus } from '../../common/enums/originator-status.enum.js';
import { Role } from '../../common/enums/role.enum.js';
import { InboxEventType } from '../../common/enums/inbox-event-type.enum.js';
import { InboxService } from '../inbox/inbox.service.js';
import { OriginatorQueryDto, OriginatorCompanyQueryDto } from './dto/originator-query.dto.js';
import { normalizeOriginatorName } from './originator-name.js';

type Actor = { id: string; role: string; companyId: string };

@Injectable()
export class OriginatorsService {
  private readonly logger = new Logger(OriginatorsService.name);

  constructor(
    @InjectRepository(CompanyOriginator)
    private readonly originatorRepository: Repository<CompanyOriginator>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(BannedOriginator)
    private readonly bannedRepository: Repository<BannedOriginator>,
    private readonly inboxService: InboxService,
  ) {}

  async assertNotBanned(names: string[]) {
    const normalized = [...new Set(names.map(normalizeOriginatorName).filter(Boolean))];
    if (!normalized.length) return;

    const banned = await this.bannedRepository.find({
      where: { name: In(normalized) },
    });
    if (banned.length) {
      throw new BadRequestException(
        `Yasaklı başlık: ${banned.map((item) => item.name).join(', ')}`,
      );
    }
  }

  async findAll(query: OriginatorQueryDto, user: Actor) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const qb = this.originatorRepository
      .createQueryBuilder('originator')
      .innerJoinAndSelect('originator.company', 'company')
      .leftJoinAndSelect('company.dealerCompany', 'dealer')
      .where('originator.deletedAt IS NULL')
      .andWhere('company.deletedAt IS NULL')
      .andWhere('company.companyCode != :adminCode', { adminCode: 'ADMIN' });

    if (user.role === Role.DEALER) {
      qb.andWhere('company.dealerCompanyId = :dealerCompanyId', {
        dealerCompanyId: user.companyId,
      });
    } else if (user.role !== Role.ADMIN) {
      throw new ForbiddenException();
    }

    if (query.companyId) {
      qb.andWhere('originator.companyId = :companyId', { companyId: query.companyId });
    }

    if (query.status) {
      qb.andWhere('originator.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(originator.name ILIKE :search OR company.name ILIKE :search OR company.companyCode ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('originator.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((originator) => this.serialize(originator)),
      total,
      page,
      limit,
    };
  }

  async findCompanies(query: OriginatorCompanyQueryDto, user: Actor) {
    const qb = this.companyRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.dealerCompany', 'dealer')
      .where('company.deletedAt IS NULL')
      .andWhere('company.companyCode != :adminCode', { adminCode: 'ADMIN' });

    if (user.role === Role.DEALER) {
      qb.andWhere('company.dealerCompanyId = :dealerCompanyId', {
        dealerCompanyId: user.companyId,
      });
    } else if (user.role === Role.ADMIN) {
      qb.andWhere(
        '(company.isDealer = true OR company.dealerCompanyId IS NULL)',
      );
    } else {
      throw new ForbiddenException();
    }

    if (query.isDealer !== undefined) {
      qb.andWhere('company.isDealer = :isDealer', { isDealer: query.isDealer });
    }

    if (query.search) {
      qb.andWhere(
        '(company.name ILIKE :search OR company.companyCode ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const companies = await qb.orderBy('company.name', 'ASC').getMany();
    const ids = companies.map((company) => company.id);
    const counts = new Map<
      string,
      { total: number; pending: number; active: number; passive: number }
    >();
    const customerPending = new Map<string, number>();

    if (ids.length) {
      const rows = await this.originatorRepository
        .createQueryBuilder('originator')
        .select('originator.companyId', 'companyId')
        .addSelect('originator.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('originator.deletedAt IS NULL')
        .andWhere('originator.companyId IN (:...ids)', { ids })
        .groupBy('originator.companyId')
        .addGroupBy('originator.status')
        .getRawMany<{ companyId: string; status: OriginatorStatus; count: string }>();

      for (const row of rows) {
        const current = counts.get(row.companyId) ?? {
          total: 0,
          pending: 0,
          active: 0,
          passive: 0,
        };
        const amount = Number(row.count);
        current.total += amount;
        if (row.status === OriginatorStatus.PENDING) current.pending += amount;
        if (row.status === OriginatorStatus.ACTIVE) current.active += amount;
        if (row.status === OriginatorStatus.PASSIVE) current.passive += amount;
        counts.set(row.companyId, current);
      }

      if (user.role === Role.ADMIN) {
        const pendingRows = await this.originatorRepository
          .createQueryBuilder('originator')
          .innerJoin('originator.company', 'company')
          .select('company.dealerCompanyId', 'dealerCompanyId')
          .addSelect('COUNT(*)', 'count')
          .where('originator.deletedAt IS NULL')
          .andWhere('company.deletedAt IS NULL')
          .andWhere('originator.status = :status', {
            status: OriginatorStatus.PENDING,
          })
          .andWhere('company.isDealer = false')
          .andWhere('company.dealerCompanyId IN (:...ids)', { ids })
          .groupBy('company.dealerCompanyId')
          .getRawMany<{ dealerCompanyId: string; count: string }>();

        for (const row of pendingRows) {
          customerPending.set(row.dealerCompanyId, Number(row.count));
        }
      }
    }

    return {
      items: companies.map((company) => ({
        id: company.id,
        name: company.name,
        companyCode: company.companyCode,
        isDealer: company.isDealer,
        dealerCompanyName: company.dealerCompany?.name,
        counts: counts.get(company.id) ?? {
          total: 0,
          pending: 0,
          active: 0,
          passive: 0,
        },
        customerPending: customerPending.get(company.id) ?? 0,
      })),
    };
  }

  async findPendingRequests(user: Actor, dealerCompanyId?: string) {
    this.assertAdmin(user);

    const qb = this.originatorRepository
      .createQueryBuilder('originator')
      .innerJoinAndSelect('originator.company', 'company')
      .leftJoinAndSelect('company.dealerCompany', 'dealer')
      .where('originator.deletedAt IS NULL')
      .andWhere('company.deletedAt IS NULL')
      .andWhere('originator.status = :status', { status: OriginatorStatus.PENDING })
      .andWhere('company.isDealer = false')
      .andWhere('company.dealerCompanyId IS NOT NULL');

    if (dealerCompanyId) {
      qb.andWhere('company.dealerCompanyId = :dealerCompanyId', { dealerCompanyId });
    }

    const items = await qb.orderBy('originator.createdAt', 'DESC').getMany();
    return { items: items.map((originator) => this.serialize(originator)) };
  }

  async hasActiveForCompany(companyId: string) {
    if (!companyId) return false;
    const count = await this.originatorRepository.count({
      where: { companyId, status: OriginatorStatus.ACTIVE },
    });
    return count > 0;
  }

  async listMine(user: Actor) {
    this.assertAdmin(user);
    const items = await this.originatorRepository.find({
      where: { companyId: user.companyId },
      relations: ['company', 'company.dealerCompany'],
      order: { createdAt: 'DESC' },
    });
    return { items: items.map((originator) => this.serialize(originator)) };
  }

  async createMine(dto: { name: string }, user: Actor) {
    this.assertAdmin(user);
    const name = normalizeOriginatorName(dto.name);
    if (!name) {
      throw new BadRequestException('Başlık adı zorunludur');
    }
    await this.assertNotBanned([name]);

    const company = await this.companyRepository.findOne({
      where: { id: user.companyId },
    });
    if (!company || company.deletedAt) {
      throw new NotFoundException('Firma bulunamadı');
    }

    const existing = await this.originatorRepository.findOne({
      where: { companyId: company.id, name },
    });
    if (existing) {
      throw new ConflictException('Bu başlık zaten kayıtlı');
    }

    const originator = this.originatorRepository.create({
      companyId: company.id,
      name,
      status: OriginatorStatus.ACTIVE,
      createdBy: user.id,
    });
    const saved = await this.originatorRepository.save(originator);
    const withCompany = await this.originatorRepository.findOne({
      where: { id: saved.id },
      relations: ['company', 'company.dealerCompany'],
    });
    return this.serialize(withCompany!);
  }

  async createRequest(dto: { companyId: string; name: string }, user: Actor) {
    const name = normalizeOriginatorName(dto.name);
    if (!name) {
      throw new BadRequestException('Başlık adı zorunludur');
    }
    await this.assertNotBanned([name]);

    const company = await this.companyRepository.findOne({
      where: { id: dto.companyId },
      relations: ['dealerCompany'],
    });
    if (!company || company.deletedAt) {
      throw new NotFoundException('Firma bulunamadı');
    }

    if (user.role === Role.DEALER) {
      if (company.id === user.companyId || company.isDealer) {
        throw new ForbiddenException(
          'Bayiler yalnızca müşterileri için başlık talebi oluşturabilir',
        );
      }
      if (company.dealerCompanyId !== user.companyId) {
        throw new ForbiddenException('Bu müşteri size bağlı değil');
      }
    } else if (user.role !== Role.ADMIN) {
      throw new ForbiddenException();
    }

    if (company.companyCode === 'ADMIN') {
      throw new ForbiddenException();
    }

    const existing = await this.originatorRepository.findOne({
      where: { companyId: company.id, name },
    });
    if (existing) {
      throw new ConflictException('Bu firma için aynı başlık zaten kayıtlı');
    }

    const originator = this.originatorRepository.create({
      companyId: company.id,
      name,
      status: OriginatorStatus.PENDING,
      createdBy: user.id,
    });
    const saved = await this.originatorRepository.save(originator);
    const withCompany = await this.originatorRepository.findOne({
      where: { id: saved.id },
      relations: ['company', 'company.dealerCompany'],
    });
    if (user.role === Role.DEALER && withCompany) {
      await this.emitInbox(InboxEventType.ORIGINATOR_REQUESTED, user, withCompany, {
        dealerName: company.dealerCompany?.name,
        dealerCompanyId: user.companyId,
        requesterUserId: user.id,
        requesterCompanyId: user.companyId,
      });
    }
    return this.serialize(withCompany!);
  }

  async updateStatus(
    id: string,
    status: OriginatorStatus.ACTIVE | OriginatorStatus.PASSIVE,
    user: Actor,
  ) {
    this.assertAdmin(user);
    const originator = await this.requireOriginator(id);
    await this.assertNotBanned([originator.name]);
    const previous = originator.status;
    originator.status = status;
    originator.updatedBy = user.id;
    await this.originatorRepository.save(originator);
    const withCompany = await this.originatorRepository.findOne({
      where: { id },
      relations: ['company', 'company.dealerCompany'],
    });
    if (withCompany && previous !== status) {
      await this.emitInbox(
        status === OriginatorStatus.ACTIVE
          ? InboxEventType.ORIGINATOR_APPROVED
          : InboxEventType.ORIGINATOR_PASSIVATED,
        user,
        withCompany,
        { previousStatus: previous },
      );
    }
    return this.serialize(withCompany!);
  }

  async listBanned(user: Actor) {
    this.assertAdmin(user);
    const items = await this.bannedRepository.find({
      order: { createdAt: 'DESC' },
    });
    return { items };
  }

  async addBanned(dto: { name: string; reason?: string }, user: Actor) {
    this.assertAdmin(user);
    const name = normalizeOriginatorName(dto.name);
    if (!name) {
      throw new BadRequestException('Başlık adı zorunludur');
    }

    const existing = await this.bannedRepository.findOne({ where: { name } });
    if (existing) {
      throw new ConflictException('Bu başlık zaten yasaklı listesinde');
    }

    const banned = this.bannedRepository.create({
      name,
      reason: dto.reason,
      createdBy: user.id,
    });
    const saved = await this.bannedRepository.save(banned);
    await this.passivateAndNotifyBanned(name, user);
    return saved;
  }

  async removeBanned(id: string, user: Actor) {
    this.assertAdmin(user);
    const banned = await this.bannedRepository.findOne({ where: { id } });
    if (!banned) {
      throw new NotFoundException('Yasaklı başlık bulunamadı');
    }
    await this.bannedRepository.remove(banned);
    return { success: true };
  }

  async banExisting(id: string, user: Actor) {
    this.assertAdmin(user);
    const originator = await this.requireOriginator(id);
    const name = originator.name;

    let banned = await this.bannedRepository.findOne({ where: { name } });
    if (!banned) {
      banned = await this.bannedRepository.save(
        this.bannedRepository.create({
          name,
          createdBy: user.id,
        }),
      );
    }

    await this.passivateAndNotifyBanned(name, user);
    return banned;
  }

  async notifyPendingForCompany(companyId: string, actor: Actor) {
    const company = await this.companyRepository.findOne({
      where: { id: companyId },
      relations: ['dealerCompany'],
    });
    if (!company) return;

    const originators = await this.originatorRepository.find({
      where: { companyId, status: OriginatorStatus.PENDING },
      relations: ['company', 'company.dealerCompany'],
    });
    for (const originator of originators) {
      originator.company = originator.company ?? company;
      await this.emitInbox(InboxEventType.ORIGINATOR_REQUESTED, actor, originator, {
        dealerName: company.dealerCompany?.name,
        dealerCompanyId: actor.companyId,
        requesterUserId: actor.id,
        requesterCompanyId: actor.companyId,
      });
    }
  }

  private async passivateAndNotifyBanned(name: string, user: Actor) {
    const affected = await this.originatorRepository.find({
      where: { name },
      relations: ['company', 'company.dealerCompany'],
    });
    await this.passivateByName(name, user.id);
    for (const originator of affected) {
      await this.emitInbox(InboxEventType.ORIGINATOR_BANNED, user, originator);
    }
  }

  private async emitInbox(
    type: InboxEventType,
    actor: Actor,
    originator: CompanyOriginator,
    extra: Record<string, unknown> = {},
  ) {
    try {
      await this.inboxService.publish({
        type,
        actorId: actor.id,
        payload: {
          originatorId: originator.id,
          originatorName: originator.name,
          customerName: originator.company?.name,
          customerCode: originator.company?.companyCode,
          dealerName: originator.company?.dealerCompany?.name,
          dealerCompanyId: originator.company?.dealerCompanyId,
          requesterUserId: originator.createdBy,
          requesterCompanyId: originator.company?.isDealer
            ? originator.companyId
            : originator.company?.dealerCompanyId,
          ownerCompanyId: originator.companyId,
          ownerIsDealer: originator.company?.isDealer ?? false,
          ...extra,
          actorCompanyId: actor.companyId,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Inbox bildirimi gönderilemedi (${type}): ${error instanceof Error ? error.message : 'bilinmeyen hata'}`,
      );
    }
  }

  private async passivateByName(name: string, userId: string) {
    await this.originatorRepository
      .createQueryBuilder()
      .update()
      .set({ status: OriginatorStatus.PASSIVE, updatedBy: userId })
      .where('name = :name', { name })
      .andWhere('deleted_at IS NULL')
      .execute();
  }

  private async requireOriginator(id: string) {
    const originator = await this.originatorRepository.findOne({
      where: { id },
      relations: ['company', 'company.dealerCompany'],
    });
    if (!originator || originator.deletedAt) {
      throw new NotFoundException('Başlık bulunamadı');
    }
    return originator;
  }

  private assertAdmin(user: Actor) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Bu işlem yalnızca ana bayi tarafından yapılabilir');
    }
  }

  private serialize(originator: CompanyOriginator) {
    const company = originator.company;
    return {
      id: originator.id,
      name: originator.name,
      status: originator.status,
      companyId: originator.companyId,
      companyName: company?.name,
      companyCode: company?.companyCode,
      isDealer: company?.isDealer ?? false,
      dealerCompanyName: company?.dealerCompany?.name,
      createdAt: originator.createdAt,
    };
  }
}
