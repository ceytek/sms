import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Company } from './entities/company.entity.js';
import { CompanyContact } from './entities/company-contact.entity.js';
import { CompanyNote } from './entities/company-note.entity.js';
import { CompanySecuritySettings } from './entities/company-security-settings.entity.js';
import { CompanyIpRule } from './entities/company-ip-rule.entity.js';
import { CompanySmsAccount } from './entities/company-sms-account.entity.js';
import { CompanyOriginator } from './entities/company-originator.entity.js';
import { CompanyCreditAlert } from './entities/company-credit-alert.entity.js';
import { CompanyService } from './entities/company-service.entity.js';
import { CompanyIysSettings } from './entities/company-iys-settings.entity.js';
import { CompanyPriceList } from './entities/company-price-list.entity.js';
import { Service } from '../reference/entities/service.entity.js';
import { CustomerCategory } from '../reference/entities/customer-category.entity.js';
import { CustomerSubcategory } from '../reference/entities/customer-subcategory.entity.js';
import { Wallet } from '../wallets/entities/wallet.entity.js';
import {
  CreateCompanyDto,
  CreateCompanyServiceDto,
} from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { CompanyQueryDto } from './dto/company-query.dto.js';
import { CompanyStatus } from '../../common/enums/company-status.enum.js';
import { WalletType } from '../../common/enums/wallet-type.enum.js';
import { IpRuleType } from '../../common/enums/ip-rule-type.enum.js';
import { IysStatus } from '../../common/enums/iys-status.enum.js';
import { OriginatorStatus } from '../../common/enums/originator-status.enum.js';
import { NotificationType } from '../../common/enums/notification-type.enum.js';
import { ContactType } from '../../common/enums/contact-type.enum.js';
import { CredentialType } from '../../common/enums/credential-type.enum.js';
import { CredentialsService } from '../credentials/credentials.service.js';
import { AuditService } from '../audit/audit.service.js';
import { User } from '../auth/entities/user.entity.js';
import { Role } from '../../common/enums/role.enum.js';
import { OriginatorsService } from '../originators/originators.service.js';
import { normalizeOriginatorName } from '../originators/originator-name.js';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

const SMS_SERVICE_CODE = 'SMS';

const COMPANY_RELATIONS = [
  'city',
  'district',
  'category',
  'subcategory',
  'parentCompany',
  'dealerCompany',
  'contacts',
  'notes',
  'securitySettings',
  'ipRules',
  'smsAccounts',
  'smsAccounts.provider',
  'originators',
  'creditAlerts',
  'services',
  'services.service',
  'iysSettings',
  'priceListAssignments',
  'priceListAssignments.priceList',
  'wallets',
] as const;

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly dataSource: DataSource,
    private readonly credentialsService: CredentialsService,
    private readonly auditService: AuditService,
    private readonly originatorsService: OriginatorsService,
  ) {}

  async findAll(
    query: CompanyQueryDto,
    user?: { id: string; role: string; companyId: string },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.companyRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.category', 'category')
      .leftJoinAndSelect('company.subcategory', 'subcategory')
      .where('company.deleted_at IS NULL');

    if (user?.role === Role.DEALER) {
      // Bayi: sadece kendi müşterilerini görür
      qb.andWhere('company.dealer_company_id = :dealerCompanyId', {
        dealerCompanyId: user.companyId,
      });
    } else if (user?.role === Role.ADMIN) {
      // Admin: bayileri + kendi direkt müşterilerini görür (bayiye bağlı müşterileri görmez)
      // company_code = 'ADMIN' olan platform kaydını da hariç tut
      qb.andWhere(
        '(company.is_dealer = true OR company.dealer_company_id IS NULL)',
      );
      qb.andWhere('company.company_code != :adminCode', {
        adminCode: 'ADMIN',
      });
    }

    if (query.isDealer !== undefined) {
      qb.andWhere('company.is_dealer = :isDealer', {
        isDealer: query.isDealer,
      });
    }

    if (query.status) {
      qb.andWhere('company.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(company.name ILIKE :search OR company.company_code ILIKE :search OR company.email ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.customerType) {
      qb.andWhere('company.customerType = :customerType', {
        customerType: query.customerType,
      });
    }

    if (query.categoryId) {
      qb.andWhere('company.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.subcategoryId) {
      qb.andWhere('company.subcategoryId = :subcategoryId', {
        subcategoryId: query.subcategoryId,
      });
    }

    qb.orderBy('company.createdAt', 'DESC').skip(skip).take(limit);

    const [rows, total] = await qb.getManyAndCount();
    const items = rows.map((company) => ({
      ...company,
      categoryName: company.category?.name ?? null,
      subcategoryName: company.subcategory?.name ?? null,
    }));

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const company = await this.companyRepository.findOne({
      where: { id },
      relations: [...COMPANY_RELATIONS],
    });

    if (!company) {
      throw new NotFoundException('Firma bulunamadı');
    }

    return this.sanitizeCompany(company);
  }

  async create(
    dto: CreateCompanyDto,
    actor: { id: string; role: string; companyId: string },
    ipAddress?: string,
  ) {
    if (actor.role === Role.DEALER && dto.isDealer === true) {
      throw new ForbiddenException('Bayiler bayi oluşturamaz');
    }

    return this.dataSource.transaction(async (manager) => {
      const companyCode = await this.generateCompanyCode(manager, dto.isDealer ?? false);

      const dealerCompanyId =
        actor.role === Role.DEALER ? actor.companyId : dto.dealerCompanyId;

      const classification = await this.resolveClassification(manager, {
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId,
      });

      const company = manager.create(Company, {
        companyCode,
        name: dto.name,
        companyType: dto.companyType,
        customerType: dto.customerType,
        categoryId: classification.categoryId,
        subcategoryId: classification.subcategoryId,
        isSubAccount: dto.isSubAccount ?? false,
        isDealer: dto.isDealer ?? false,
        parentCompanyId: dto.parentCompanyId,
        dealerCompanyId,
        taxOffice: dto.taxOffice,
        taxNumber: dto.taxNumber,
        nationalId: dto.nationalId,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        serialNumber: dto.serialNumber,
        cityId: dto.cityId,
        districtId: dto.districtId,
        address: dto.address,
        phone: dto.phone,
        mobile: dto.mobile,
        email: dto.email,
        showAnnouncement: dto.showAnnouncement ?? true,
        documentsCompleted: dto.documentsCompleted ?? false,
        createdBy: actor.id,
      });

      const savedCompany = await manager.save(company);

      if (dto.contacts?.length) {
        const contacts = dto.contacts.map((contact) =>
          manager.create(CompanyContact, {
            ...contact,
            companyId: savedCompany.id,
            createdBy: actor.id,
          }),
        );
        await manager.save(contacts);
      }

      if (dto.security) {
        await this.saveSecuritySettings(
          manager,
          savedCompany.id,
          dto.security,
        );
      }

      const savedSmsAccounts = await this.saveSmsAccounts(
        manager,
        savedCompany.id,
        dto.smsAccounts,
      );

      if (dto.originators?.length) {
        await this.saveOriginators(
          manager,
          savedCompany.id,
          dto.originators,
          savedSmsAccounts,
        );
      }

      if (dto.creditAlerts?.length) {
        const alerts = dto.creditAlerts.map((alert, index) =>
          manager.create(CompanyCreditAlert, {
            companyId: savedCompany.id,
            threshold: alert.threshold,
            message: alert.message,
            notificationType: alert.notificationType ?? NotificationType.EMAIL,
            sortOrder: alert.sortOrder ?? index,
            isActive: alert.isActive ?? true,
          }),
        );
        await manager.save(alerts);
      }

      await this.saveCompanyServices(
        manager,
        savedCompany.id,
        dto.services ?? [],
      );

      if (dto.iys) {
        await this.saveIysSettings(manager, savedCompany.id, dto.iys);
      }

      if (dto.notes?.length) {
        const notes = dto.notes.map((note) =>
          manager.create(CompanyNote, {
            companyId: savedCompany.id,
            note: note.note,
            showOnOpen: note.showOnOpen ?? false,
            createdBy: actor.id,
          }),
        );
        await manager.save(notes);
      }

      if (dto.priceListId) {
        const assignment = manager.create(CompanyPriceList, {
          companyId: savedCompany.id,
          priceListId: dto.priceListId,
          assignedBy: actor.id,
        });
        await manager.save(assignment);
      }

      const wallets = [
        manager.create(Wallet, {
          companyId: savedCompany.id,
          walletType: WalletType.SMS,
          balance: 0,
        }),
        manager.create(Wallet, {
          companyId: savedCompany.id,
          walletType: WalletType.AI,
          balance: 0,
        }),
      ];
      await manager.save(wallets);

      // Generate or use provided credentials
      const generatedPassword = dto.accountPassword || crypto.randomBytes(4).toString('hex');
      const passwordHash = await bcrypt.hash(generatedPassword, 10);
      const userRole = dto.isDealer ? Role.DEALER : Role.CUSTOMER;
      const accountUsername = dto.accountUsername || companyCode;

      const newUser = manager.create(User, {
        companyId: savedCompany.id,
        companyCode: companyCode,
        username: accountUsername,
        passwordHash,
        role: userRole,
      });
      await manager.save(newUser);

      await this.auditService.log(
        'CREATE',
        'Company',
        savedCompany.id,
        actor.id,
        savedCompany.id,
        null,
        { companyCode, name: dto.name },
        ipAddress,
        manager,
      );

      const result = await this.findOneInTransaction(manager, savedCompany.id);
      return {
        ...result,
        generatedCredentials: {
          companyCode,
          username: accountUsername,
          password: generatedPassword,
          role: userRole,
        },
      };
    });
  }

  async update(
    id: string,
    dto: UpdateCompanyDto,
    actorUserId: string,
    ipAddress?: string,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const company = await manager.findOne(Company, { where: { id } });
      if (!company) {
        throw new NotFoundException('Firma bulunamadı');
      }

      const oldValues = { ...company };

      const classification = await this.resolveClassification(manager, {
        categoryId: dto.categoryId !== undefined ? dto.categoryId : company.categoryId,
        subcategoryId:
          dto.subcategoryId !== undefined ? dto.subcategoryId : company.subcategoryId,
      });

      Object.assign(company, {
        name: dto.name ?? company.name,
        companyType: dto.companyType ?? company.companyType,
        customerType:
          dto.customerType !== undefined ? dto.customerType ?? undefined : company.customerType,
        categoryId: classification.categoryId ?? null,
        subcategoryId: classification.subcategoryId ?? null,
        isSubAccount: dto.isSubAccount ?? company.isSubAccount,
        isDealer: dto.isDealer ?? company.isDealer,
        parentCompanyId: dto.parentCompanyId ?? company.parentCompanyId,
        dealerCompanyId: dto.dealerCompanyId ?? company.dealerCompanyId,
        taxOffice: dto.taxOffice ?? company.taxOffice,
        taxNumber: dto.taxNumber ?? company.taxNumber,
        nationalId: dto.nationalId ?? company.nationalId,
        birthDate: dto.birthDate
          ? new Date(dto.birthDate)
          : company.birthDate,
        serialNumber: dto.serialNumber ?? company.serialNumber,
        cityId: dto.cityId !== undefined ? dto.cityId ?? null : company.cityId,
        districtId: dto.districtId !== undefined ? dto.districtId ?? null : company.districtId,
        address: dto.address ?? company.address,
        phone: dto.phone ?? company.phone,
        mobile: dto.mobile ?? company.mobile,
        email: dto.email ?? company.email,
        showAnnouncement: dto.showAnnouncement ?? company.showAnnouncement,
        documentsCompleted:
          dto.documentsCompleted ?? company.documentsCompleted,
        updatedBy: actorUserId,
      });

      await manager.save(company);

      if (dto.contacts !== undefined) {
        await manager.delete(CompanyContact, { companyId: id });
        if (dto.contacts.length) {
          const contacts = dto.contacts.map((contact) =>
            manager.create(CompanyContact, {
              ...contact,
              companyId: id,
              createdBy: actorUserId,
            }),
          );
          await manager.save(contacts);
        }
      }

      if (dto.security !== undefined) {
        await manager.delete(CompanyIpRule, { companyId: id });
        await manager.delete(CompanySecuritySettings, { companyId: id });
        if (dto.security) {
          await this.saveSecuritySettings(manager, id, dto.security);
        }
      }

      let savedSmsAccounts: CompanySmsAccount[] = [];
      if (dto.smsAccounts !== undefined) {
        const existingAccounts = await manager.find(CompanySmsAccount, {
          where: { companyId: id },
        });
        for (const account of existingAccounts) {
          await this.credentialsService.delete(
            id,
            CredentialType.SMS_PASSWORD,
            'CompanySmsAccount',
            account.id,
            manager,
          );
        }
        await manager.query(
          `UPDATE company_originators SET sms_account_id = NULL WHERE company_id = $1`,
          [id],
        );
        await manager.delete(CompanySmsAccount, { companyId: id });
        savedSmsAccounts = await this.saveSmsAccounts(
          manager,
          id,
          dto.smsAccounts,
        );
      }

      if (dto.originators !== undefined) {
        throw new BadRequestException(
          'Başlıklar Originatör Yönetimi ekranından yönetilir',
        );
      }

      if (dto.creditAlerts !== undefined) {
        await manager.delete(CompanyCreditAlert, { companyId: id });
        if (dto.creditAlerts.length) {
          const alerts = dto.creditAlerts.map((alert, index) =>
            manager.create(CompanyCreditAlert, {
              companyId: id,
              threshold: alert.threshold,
              message: alert.message,
              notificationType:
                alert.notificationType ?? NotificationType.EMAIL,
              sortOrder: alert.sortOrder ?? index,
              isActive: alert.isActive ?? true,
            }),
          );
          await manager.save(alerts);
        }
      }

      if (dto.services !== undefined) {
        await manager.delete(CompanyService, { companyId: id });
        await this.saveCompanyServices(manager, id, dto.services);
      }

      if (dto.iys !== undefined) {
        const existingIys = await manager.findOne(CompanyIysSettings, {
          where: { companyId: id },
        });
        if (existingIys) {
          await this.credentialsService.delete(
            id,
            CredentialType.IYS_API_KEY,
            'CompanyIysSettings',
            existingIys.id,
            manager,
          );
        }
        await manager.delete(CompanyIysSettings, { companyId: id });
        if (dto.iys) {
          await this.saveIysSettings(manager, id, dto.iys);
        }
      }

      if (dto.notes !== undefined) {
        await manager.softDelete(CompanyNote, { companyId: id });
        if (dto.notes.length) {
          const notes = dto.notes.map((note) =>
            manager.create(CompanyNote, {
              companyId: id,
              note: note.note,
              showOnOpen: note.showOnOpen ?? false,
              createdBy: actorUserId,
            }),
          );
          await manager.save(notes);
        }
      }

      if (dto.priceListId !== undefined) {
        await manager.delete(CompanyPriceList, { companyId: id });
        if (dto.priceListId) {
          const assignment = manager.create(CompanyPriceList, {
            companyId: id,
            priceListId: dto.priceListId,
            assignedBy: actorUserId,
          });
          await manager.save(assignment);
        }
      }

      await this.auditService.log(
        'UPDATE',
        'Company',
        id,
        actorUserId,
        id,
        oldValues as unknown as Record<string, unknown>,
        dto as unknown as Record<string, unknown>,
        ipAddress,
        manager,
      );

      return this.findOneInTransaction(manager, id);
    });
  }

  async addService(companyId: string, serviceId: string, actorUserId: string) {
    return this.dataSource.transaction(async (manager) => {
      const company = await manager.findOne(Company, { where: { id: companyId } });
      if (!company) {
        throw new NotFoundException('Firma bulunamadı');
      }

      const service = await manager.findOne(Service, { where: { id: serviceId } });
      if (!service || !service.isActive) {
        throw new BadRequestException('Hizmet bulunamadı veya pasif');
      }

      const existing = await manager.findOne(CompanyService, {
        where: { companyId, serviceId },
      });
      if (existing) {
        throw new BadRequestException('Bu hizmet zaten tanımlı');
      }

      await manager.save(
        manager.create(CompanyService, {
          companyId,
          serviceId,
          isActive: true,
        }),
      );

      if (service.code === 'AI') {
        const aiWallet = await manager.findOne(Wallet, {
          where: { companyId, walletType: WalletType.AI },
        });
        if (!aiWallet) {
          await manager.save(
            manager.create(Wallet, {
              companyId,
              walletType: WalletType.AI,
              balance: 0,
            }),
          );
        }
      }

      await this.auditService.log(
        'UPDATE',
        'CompanyService',
        companyId,
        actorUserId,
        companyId,
        null,
        { serviceId, serviceCode: service.code },
        undefined,
        manager,
      );

      return this.findOneInTransaction(manager, companyId);
    });
  }

  async addContact(
    companyId: string,
    dto: { name: string; contactType: ContactType; mobile?: string; phone?: string; email?: string; description?: string },
    actorUserId: string,
  ) {
    const company = await this.companyRepository.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException('Firma bulunamadı');
    }

    await this.companyRepository.manager.save(
      this.companyRepository.manager.create(CompanyContact, {
        companyId,
        name: dto.name.trim(),
        contactType: dto.contactType,
        mobile: dto.mobile || undefined,
        phone: dto.phone || undefined,
        email: dto.email || undefined,
        description: dto.description || undefined,
        createdBy: actorUserId,
      }),
    );

    return this.findOne(companyId);
  }

  async removeContact(companyId: string, contactId: string) {
    const contact = await this.companyRepository.manager.findOne(CompanyContact, {
      where: { id: contactId, companyId },
    });
    if (!contact) {
      throw new NotFoundException('İletişim kişisi bulunamadı');
    }
    await this.companyRepository.manager.softDelete(CompanyContact, { id: contactId });
    return this.findOne(companyId);
  }

  async updateStatus(
    id: string,
    status: CompanyStatus,
    actorUserId: string,
    ipAddress?: string,
  ) {
    const company = await this.companyRepository.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException('Firma bulunamadı');
    }

    if (status !== CompanyStatus.ACTIVE && status !== CompanyStatus.PASSIVE) {
      throw new BadRequestException(
        'Durum yalnızca ACTIVE veya PASSIVE olarak ayarlanabilir',
      );
    }

    const oldStatus = company.status;
    company.status = status;
    company.updatedBy = actorUserId;
    await this.companyRepository.save(company);

    await this.auditService.log(
      'STATUS_CHANGE',
      'Company',
      id,
      actorUserId,
      id,
      { status: oldStatus },
      { status },
      ipAddress,
    );

    return this.findOne(id);
  }

  async findCompanyUsers(companyId: string) {
    const users = await this.dataSource.getRepository(User).find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));
  }

  async createCompanyUser(companyId: string, username: string, password: string) {
    const company = await this.companyRepository.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException('Firma bulunamadı');
    }

    const existingUser = await this.dataSource.getRepository(User).findOne({
      where: { companyCode: company.companyCode, username },
    });
    if (existingUser) {
      throw new ForbiddenException('Bu kullanıcı adı zaten mevcut');
    }

    const role = company.isDealer ? Role.DEALER : Role.CUSTOMER;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = this.dataSource.getRepository(User).create({
      companyId,
      companyCode: company.companyCode,
      username,
      passwordHash,
      role,
      isActive: true,
    });

    const saved = await this.dataSource.getRepository(User).save(user);
    return {
      id: saved.id,
      username: saved.username,
      role: saved.role,
      companyCode: company.companyCode,
      isActive: saved.isActive,
      createdAt: saved.createdAt,
    };
  }

  async resetUserPassword(companyId: string, userId: string, newPassword: string) {
    const user = await this.dataSource.getRepository(User).findOne({
      where: { id: userId, companyId },
    });
    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.dataSource.getRepository(User).save(user);

    return { message: 'Şifre başarıyla güncellendi' };
  }

  private async generateCompanyCode(manager: EntityManager, isDealer: boolean): Promise<string> {
    const prefix = isDealer ? 'B' : 'F';
    const result = await manager
      .createQueryBuilder(Company, 'company')
      .select(
        `MAX(CAST(SUBSTRING(company.company_code FROM 2) AS INTEGER))`,
        'maxCode',
      )
      .where(`company.company_code LIKE :prefix`, { prefix: `${prefix}%` })
      .andWhere(`LENGTH(company.company_code) = 6`)
      .getRawOne<{ maxCode: string | null }>();

    const maxCode = result?.maxCode ? parseInt(result.maxCode, 10) : 0;
    return prefix + String(maxCode + 1).padStart(5, '0');
  }

  private async saveCompanyServices(
    manager: EntityManager,
    companyId: string,
    extra: CreateCompanyServiceDto[] = [],
  ) {
    const smsService = await manager.findOne(Service, {
      where: { code: SMS_SERVICE_CODE },
    });
    if (!smsService) {
      throw new BadRequestException('SMS servisi katalogda bulunamadı');
    }

    const extras = extra.filter((service) => service.serviceId !== smsService.id);
    const rows = [
      manager.create(CompanyService, {
        companyId,
        serviceId: smsService.id,
        isActive: true,
      }),
      ...extras.map((service) =>
        manager.create(CompanyService, {
          companyId,
          serviceId: service.serviceId,
          isActive: service.isActive ?? true,
          startDate: service.startDate
            ? new Date(service.startDate)
            : undefined,
          endDate: service.endDate ? new Date(service.endDate) : undefined,
        }),
      ),
    ];
    await manager.save(rows);
  }

  private async saveSecuritySettings(
    manager: EntityManager,
    companyId: string,
    security: NonNullable<CreateCompanyDto['security']>,
  ) {
    const settings = manager.create(CompanySecuritySettings, {
      companyId,
      ipRuleType: security.ipRuleType ?? IpRuleType.NO_CONTROL,
    });
    const savedSettings = await manager.save(settings);

    if (security.filePassword) {
      await this.credentialsService.store(
        companyId,
        CredentialType.FILE_PASSWORD,
        'CompanySecuritySettings',
        savedSettings.id,
        security.filePassword,
        manager,
      );
    }

    if (security.ipRules?.length) {
      const rules = security.ipRules.map((rule) =>
        manager.create(CompanyIpRule, {
          companyId,
          ipAddress: rule.ipAddress,
          description: rule.description,
          isActive: rule.isActive ?? true,
        }),
      );
      await manager.save(rules);
    }
  }

  private async saveSmsAccounts(
    manager: EntityManager,
    companyId: string,
    smsAccounts?: CreateCompanyDto['smsAccounts'],
  ): Promise<CompanySmsAccount[]> {
    if (!smsAccounts?.length) {
      return [];
    }

    const saved: CompanySmsAccount[] = [];
    for (const account of smsAccounts) {
      const { password, ...accountData } = account;
      const smsAccount = manager.create(CompanySmsAccount, {
        ...accountData,
        companyId,
      });
      const savedAccount = await manager.save(smsAccount);
      saved.push(savedAccount);

      if (password) {
        await this.credentialsService.store(
          companyId,
          CredentialType.SMS_PASSWORD,
          'CompanySmsAccount',
          savedAccount.id,
          password,
          manager,
        );
      }
    }
    return saved;
  }

  private async saveOriginators(
    manager: EntityManager,
    companyId: string,
    originators: NonNullable<CreateCompanyDto['originators']>,
    smsAccounts: CompanySmsAccount[],
  ) {
    const entities: CompanyOriginator[] = [];
    const names = originators.map((item) => normalizeOriginatorName(item.name));
    await this.originatorsService.assertNotBanned(names);

    for (const originator of originators) {
      let smsAccountId = originator.smsAccountId;
      if (
        originator.smsAccountIndex !== undefined &&
        smsAccounts[originator.smsAccountIndex]
      ) {
        smsAccountId = smsAccounts[originator.smsAccountIndex].id;
      }

      const name = normalizeOriginatorName(originator.name);
      if (!name) continue;

      entities.push(
        manager.create(CompanyOriginator, {
          companyId,
          name,
          smsAccountId,
          status: OriginatorStatus.PENDING,
          providerReference: originator.providerReference,
        }),
      );
    }
    if (entities.length) {
      await manager.save(entities);
    }
  }

  private async saveIysSettings(
    manager: EntityManager,
    companyId: string,
    iys: NonNullable<CreateCompanyDto['iys']>,
  ) {
    const { apiKey, ...iysData } = iys;
    const settings = manager.create(CompanyIysSettings, {
      ...iysData,
      companyId,
      status: iys.status ?? IysStatus.PASSIVE,
    });
    const savedSettings = await manager.save(settings);

    if (apiKey) {
      await this.credentialsService.store(
        companyId,
        CredentialType.IYS_API_KEY,
        'CompanyIysSettings',
        savedSettings.id,
        apiKey,
        manager,
      );
    }
  }

  private async resolveClassification(
    manager: EntityManager,
    input: { categoryId?: string | null; subcategoryId?: string | null },
  ) {
    let categoryId = input.categoryId || undefined;
    let subcategoryId = input.subcategoryId || undefined;

    if (subcategoryId) {
      const subcategory = await manager.findOne(CustomerSubcategory, {
        where: { id: subcategoryId },
      });
      if (!subcategory) {
        throw new BadRequestException('Alt kategori bulunamadı');
      }
      if (categoryId && subcategory.categoryId !== categoryId) {
        throw new BadRequestException('Alt kategori seçilen ana kategoriye ait değil');
      }
      categoryId = subcategory.categoryId;
    }

    if (categoryId) {
      const category = await manager.findOne(CustomerCategory, {
        where: { id: categoryId },
      });
      if (!category) {
        throw new BadRequestException('Ana kategori bulunamadı');
      }
    } else {
      subcategoryId = undefined;
    }

    return { categoryId, subcategoryId };
  }

  private async findOneInTransaction(manager: EntityManager, id: string) {
    const company = await manager.findOne(Company, {
      where: { id },
      relations: [...COMPANY_RELATIONS],
    });

    if (!company) {
      throw new NotFoundException('Firma bulunamadı');
    }

    return this.sanitizeCompany(company);
  }

  private sanitizeCompany(company: Company) {
    const c = company as any;

    const priceAssignment = [...(c.priceListAssignments ?? [])].sort(
      (a: { assignedAt: string | Date }, b: { assignedAt: string | Date }) =>
        new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime(),
    )[0];
    const wallets: any[] = c.wallets ?? [];
    const smsWallet = wallets.find((w: any) => w.walletType === WalletType.SMS);
    const aiWallet = wallets.find((w: any) => w.walletType === WalletType.AI);

    return {
      ...company,
      parentCompanyName: company.parentCompany?.name ?? null,
      dealerCompanyName: company.dealerCompany?.name ?? null,
      cityName: company.city?.name ?? null,
      districtName: company.district?.name ?? null,
      categoryName: company.category?.name ?? null,
      subcategoryName: company.subcategory?.name ?? null,
      priceListId: priceAssignment?.priceListId ?? null,
      priceListName: priceAssignment?.priceList?.name ?? null,
      smsBalance: Number(smsWallet?.balance ?? 0),
      aiBalance: Number(aiWallet?.balance ?? 0),
      services: c.services?.map((s: any) => ({
        serviceId: s.serviceId,
        serviceName: s.service?.name ?? s.serviceId,
        serviceCode: s.service?.code,
        isActive: s.isActive,
        startDate: s.startDate,
        endDate: s.endDate,
      })),
      securitySettings: company.securitySettings?.map((settings) => ({
        ...settings,
        filePasswordEncrypted: settings.filePasswordEncrypted
          ? '[REDACTED]'
          : undefined,
      })),
    };
  }
}
