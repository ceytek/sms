import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Company } from '../companies/entities/company.entity.js';
import { CompanyService } from '../companies/entities/company-service.entity.js';
import { Wallet } from '../wallets/entities/wallet.entity.js';
import { WalletTransaction } from '../wallets/entities/wallet-transaction.entity.js';
import { User } from '../auth/entities/user.entity.js';
import { Role } from '../../common/enums/role.enum.js';
import { CompanyStatus } from '../../common/enums/company-status.enum.js';
import { WalletType } from '../../common/enums/wallet-type.enum.js';
import { TransactionType } from '../../common/enums/transaction-type.enum.js';
import { CreditCustomerQueryDto, CreditHistoryQueryDto } from './dto/credit-query.dto.js';
import { LoadCreditDto } from './dto/load-credit.dto.js';
import { HistoryPeriod } from '../../common/enums/history-period.enum.js';

type Actor = { id: string; role: string; companyId: string };

const AI_SERVICE_CODE = 'AI';

@Injectable()
export class CreditsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(WalletTransaction)
    private readonly transactionRepository: Repository<WalletTransaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findCustomers(query: CreditCustomerQueryDto, actor: Actor) {
    const qb = this.companyRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.wallets', 'wallet')
      .leftJoinAndSelect('company.priceListAssignments', 'assignment')
      .leftJoinAndSelect('assignment.priceList', 'priceList')
      .leftJoinAndSelect('company.services', 'companyService')
      .leftJoinAndSelect('companyService.service', 'service')
      .where('company.deletedAt IS NULL')
      .andWhere('company.isDealer = false')
      .andWhere('company.companyCode != :adminCode', { adminCode: 'ADMIN' });

    this.applyCustomerScope(qb, actor);

    if (query.search) {
      qb.andWhere(
        '(company.name ILIKE :search OR company.companyCode ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const companies = await qb.orderBy('company.name', 'ASC').getMany();
    return { items: companies.map((company) => this.toCustomer(company)) };
  }

  async findCustomer(companyId: string, actor: Actor) {
    const company = await this.getScopedCustomer(companyId, actor);
    return this.toCustomer(company);
  }

  async findHistory(companyId: string, query: CreditHistoryQueryDto, actor: Actor) {
    await this.getScopedCustomer(companyId, actor);

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const qb = this.transactionRepository
      .createQueryBuilder('tx')
      .innerJoinAndSelect('tx.wallet', 'wallet')
      .leftJoinAndSelect('tx.priceList', 'priceList')
      .where('wallet.companyId = :companyId', { companyId })
      .andWhere('wallet.walletType = :walletType', { walletType: query.walletType })
      .andWhere('tx.transactionType IN (:...types)', {
        types: [TransactionType.CREDIT, TransactionType.REFUND],
      });

    if (query.period) {
      qb.andWhere('tx.createdAt >= :from', { from: startOfPeriod(query.period) });
    }

    const summaryQb = this.transactionRepository
      .createQueryBuilder('tx')
      .innerJoin('tx.wallet', 'wallet')
      .where('wallet.companyId = :companyId', { companyId })
      .andWhere('wallet.walletType = :walletType', { walletType: query.walletType })
      .andWhere('tx.transactionType IN (:...types)', {
        types: [TransactionType.CREDIT, TransactionType.REFUND],
      })
      .select('COALESCE(SUM(tx.amount), 0)', 'net')
      .addSelect(
        'COALESCE(SUM(CASE WHEN tx.amount > 0 THEN tx.amount ELSE 0 END), 0)',
        'loaded',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN tx.amount < 0 THEN -tx.amount ELSE 0 END), 0)',
        'refunded',
      )
      .addSelect('COUNT(tx.id)', 'count');

    if (query.period) {
      summaryQb.andWhere('tx.createdAt >= :from', { from: startOfPeriod(query.period) });
    }

    const summaryRaw = await summaryQb.getRawOne<{
      net: string;
      loaded: string;
      refunded: string;
      count: string;
    }>();

    qb.orderBy('tx.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();
    const actors = await this.loadActors(rows.map((row) => row.createdBy));

    return {
      items: rows.map((row) => ({
        id: row.id,
        walletType: row.wallet.walletType,
        transactionType: row.transactionType,
        amount: Number(row.amount),
        unitPrice: row.unitPrice == null ? null : Number(row.unitPrice),
        balanceBefore: Number(row.balanceBefore),
        balanceAfter: Number(row.balanceAfter),
        priceListName: row.priceList?.name ?? null,
        createdByName: row.createdBy ? actors.get(row.createdBy) ?? null : null,
        createdAt: row.createdAt,
      })),
      summary: {
        loaded: Number(summaryRaw?.loaded ?? 0),
        refunded: Number(summaryRaw?.refunded ?? 0),
        net: Number(summaryRaw?.net ?? 0),
        count: Number(summaryRaw?.count ?? 0),
      },
      period: query.period ?? null,
      total,
      page,
      limit,
    };
  }

  async load(dto: LoadCreditDto, actor: Actor) {
    if (actor.role !== Role.ADMIN && actor.role !== Role.DEALER) {
      throw new ForbiddenException();
    }

    return this.dataSource.transaction(async (manager) => {
      const company = await this.getScopedCustomer(dto.companyId, actor, manager.getRepository(Company));
      const amount = Number(dto.amount);
      const isRefund = amount < 0;

      if (!isRefund && company.status !== CompanyStatus.ACTIVE) {
        throw new BadRequestException('Pasif veya askıdaki müşteriye kredi yüklenemez');
      }

      if (!isRefund && dto.walletType === WalletType.AI && !this.hasActiveAi(company)) {
        throw new BadRequestException(
          'Bu müşteride AI servisi aktif değil. Servis açıldıktan sonra AI kredisi yüklenebilir.',
        );
      }

      let wallet = await manager.findOne(Wallet, {
        where: { companyId: company.id, walletType: dto.walletType },
        lock: { mode: 'pessimistic_write' },
      });
      if (!wallet) {
        wallet = await manager.save(
          manager.create(Wallet, {
            companyId: company.id,
            walletType: dto.walletType,
            balance: 0,
          }),
        );
        wallet = await manager.findOne(Wallet, {
          where: { id: wallet.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!wallet) {
          throw new BadRequestException('Cüzdan oluşturulamadı');
        }
      }

      const assignment = this.latestPriceList(company);
      const before = Number(wallet.balance);
      const after = before + amount;
      if (after < 0) {
        throw new BadRequestException(
          `Bakiye yetersiz. Mevcut ${dto.walletType} bakiyesi ${before}`,
        );
      }
      const unitPrice =
        dto.unitPrice === undefined || dto.unitPrice === null || Number.isNaN(Number(dto.unitPrice))
          ? undefined
          : Number(dto.unitPrice);

      wallet.balance = after;
      await manager.save(wallet);

      const tx = await manager.save(
        manager.create(WalletTransaction, {
          walletId: wallet.id,
          transactionType: isRefund ? TransactionType.REFUND : TransactionType.CREDIT,
          amount,
          balanceBefore: before,
          balanceAfter: after,
          unitPrice,
          priceListId: assignment?.priceListId,
          referenceType: assignment ? 'PRICE_LIST' : isRefund ? 'CREDIT_REFUND' : 'CREDIT_LOAD',
          referenceId: assignment?.priceListId,
          createdBy: actor.id,
        }),
      );

      return {
        id: tx.id,
        companyId: company.id,
        walletType: dto.walletType,
        transactionType: tx.transactionType,
        amount,
        unitPrice: unitPrice ?? null,
        balanceAfter: after,
        priceListName: assignment?.priceList?.name ?? null,
        createdAt: tx.createdAt,
      };
    });
  }

  private applyCustomerScope(
    qb: ReturnType<Repository<Company>['createQueryBuilder']>,
    actor: Actor,
  ) {
    if (actor.role === Role.DEALER) {
      qb.andWhere('company.dealerCompanyId = :dealerCompanyId', {
        dealerCompanyId: actor.companyId,
      });
      return;
    }
    if (actor.role === Role.ADMIN) {
      qb.andWhere('company.dealerCompanyId IS NULL');
      return;
    }
    throw new ForbiddenException();
  }

  private async getScopedCustomer(
    companyId: string,
    actor: Actor,
    repository: Repository<Company> = this.companyRepository,
  ) {
    const qb = repository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.wallets', 'wallet')
      .leftJoinAndSelect('company.priceListAssignments', 'assignment')
      .leftJoinAndSelect('assignment.priceList', 'priceList')
      .leftJoinAndSelect('company.services', 'companyService')
      .leftJoinAndSelect('companyService.service', 'service')
      .where('company.id = :companyId', { companyId })
      .andWhere('company.deletedAt IS NULL')
      .andWhere('company.isDealer = false')
      .andWhere('company.companyCode != :adminCode', { adminCode: 'ADMIN' });

    this.applyCustomerScope(qb, actor);

    const company = await qb.getOne();
    if (!company) {
      throw new NotFoundException('Müşteri bulunamadı');
    }
    return company;
  }

  private hasActiveAi(company: Company) {
    return (company.services ?? []).some(
      (row: CompanyService) =>
        row.isActive && row.service?.code === AI_SERVICE_CODE,
    );
  }

  private latestPriceList(company: Company) {
    const assignments = [...(company.priceListAssignments ?? [])].sort(
      (a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime(),
    );
    return assignments[0];
  }

  private toCustomer(company: Company) {
    const wallets = company.wallets ?? [];
    const assignment = this.latestPriceList(company);
    return {
      id: company.id,
      name: company.name,
      companyCode: company.companyCode,
      status: company.status,
      smsBalance: Number(
        wallets.find((wallet) => wallet.walletType === WalletType.SMS)?.balance ?? 0,
      ),
      aiBalance: Number(
        wallets.find((wallet) => wallet.walletType === WalletType.AI)?.balance ?? 0,
      ),
      hasAiService: this.hasActiveAi(company),
      priceList: assignment?.priceList
        ? { id: assignment.priceList.id, name: assignment.priceList.name }
        : null,
    };
  }

  private async loadActors(ids: Array<string | undefined>) {
    const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
    if (!unique.length) return new Map<string, string>();
    const users = await this.userRepository.find({ where: { id: In(unique) } });
    return new Map(users.map((user) => [user.id, user.username]));
  }
}

const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;

function startOfPeriod(period: HistoryPeriod): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const istanbulMidnightUtc = Date.UTC(year, month - 1, day) - ISTANBUL_OFFSET_MS;

  if (period === HistoryPeriod.DAY) {
    return new Date(istanbulMidnightUtc);
  }

  if (period === HistoryPeriod.WEEK) {
    const weekdayIndex: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const weekday = weekdayIndex[parts.weekday] ?? 1;
    const mondayOffset = weekday === 0 ? 6 : weekday - 1;
    return new Date(istanbulMidnightUtc - mondayOffset * 24 * 60 * 60 * 1000);
  }

  if (period === HistoryPeriod.MONTH) {
    return new Date(Date.UTC(year, month - 1, 1) - ISTANBUL_OFFSET_MS);
  }

  return new Date(Date.UTC(year, 0, 1) - ISTANBUL_OFFSET_MS);
}
