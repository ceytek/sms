import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from './entities/city.entity.js';
import { District } from './entities/district.entity.js';
import { SmsProvider } from './entities/sms-provider.entity.js';
import { Service } from './entities/service.entity.js';
import { Product } from './entities/product.entity.js';
import { CustomerCategory } from './entities/customer-category.entity.js';
import { CustomerSubcategory } from './entities/customer-subcategory.entity.js';
import { PriceList } from '../pricing/entities/price-list.entity.js';
import { CompanySmsAccount } from '../companies/entities/company-sms-account.entity.js';
import { Company } from '../companies/entities/company.entity.js';
import { CreateProviderDto } from './dto/create-provider.dto.js';
import { UpdateProviderDto } from './dto/update-provider.dto.js';
import { CredentialsService } from '../credentials/credentials.service.js';
import { CredentialType } from '../../common/enums/credential-type.enum.js';

const PLATFORM_COMPANY_CODE = 'ADMIN';

@Injectable()
export class ReferenceService {
  constructor(
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
    @InjectRepository(District)
    private readonly districtRepository: Repository<District>,
    @InjectRepository(SmsProvider)
    private readonly smsProviderRepository: Repository<SmsProvider>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(CustomerCategory)
    private readonly customerCategoryRepository: Repository<CustomerCategory>,
    @InjectRepository(CustomerSubcategory)
    private readonly customerSubcategoryRepository: Repository<CustomerSubcategory>,
    @InjectRepository(PriceList)
    private readonly priceListRepository: Repository<PriceList>,
    @InjectRepository(CompanySmsAccount)
    private readonly companySmsAccountRepository: Repository<CompanySmsAccount>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    private readonly credentialsService: CredentialsService,
  ) {}

  findCities() {
    return this.cityRepository.find({ order: { name: 'ASC' } });
  }

  findDistrictsByCity(cityId: number) {
    return this.districtRepository.find({
      where: { cityId },
      order: { name: 'ASC' },
    });
  }

  findSmsProviders() {
    return this.smsProviderRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  findServices() {
    return this.serviceRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  findProducts() {
    return this.productRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  findPriceLists() {
    return this.priceListRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  findCustomerCategories() {
    return this.customerCategoryRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  findCustomerSubcategories(categoryId: string) {
    return this.customerSubcategoryRepository.find({
      where: { categoryId, isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findAllProviders() {
    const providers = await this.smsProviderRepository.find({
      order: { name: 'ASC' },
    });

    const platform = await this.companyRepository.findOne({
      where: { companyCode: PLATFORM_COMPANY_CODE },
      select: ['id'],
    });
    const platformAccounts = platform
      ? await this.companySmsAccountRepository.find({
          where: { companyId: platform.id, isActive: true },
        })
      : [];

    const providersWithCount = await Promise.all(
      providers.map(async (p) => {
        const companyCount = await this.companySmsAccountRepository.count({
          where: { providerId: p.id, isActive: true },
        });
        const platformAccount = platformAccounts.find((account) => account.providerId === p.id);
        const hasPlatformPassword = platformAccount
          ? await this.credentialsService.has(
              platformAccount.companyId,
              CredentialType.SMS_PASSWORD,
              'CompanySmsAccount',
              platformAccount.id,
            )
          : false;
        return {
          ...p,
          companyCount,
          platformUsername: platformAccount?.username ?? '',
          hasPlatformPassword,
        };
      }),
    );

    return providersWithCount;
  }

  async findProviderCompanies(providerId: string) {
    const accounts = await this.companySmsAccountRepository.find({
      where: { providerId, isActive: true },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
    return accounts.map((a) => ({
      id: a.id,
      companyId: a.companyId,
      companyCode: a.company?.companyCode,
      companyName: a.company?.name,
      username: a.username,
      createdAt: a.createdAt,
    }));
  }

  async createProvider(dto: CreateProviderDto) {
    const provider = this.smsProviderRepository.create({
      code: dto.code,
      name: dto.name,
      isActive: dto.isActive ?? true,
    });
    return this.smsProviderRepository.save(provider);
  }

  async updateProvider(id: string, dto: UpdateProviderDto) {
    const provider = await this.smsProviderRepository.findOne({
      where: { id },
    });
    if (!provider) {
      throw new NotFoundException('Sağlayıcı bulunamadı');
    }

    Object.assign(provider, {
      code: dto.code ?? provider.code,
      name: dto.name ?? provider.name,
      isActive: dto.isActive ?? provider.isActive,
      configSchema: dto.configSchema ?? provider.configSchema,
      rateLimits: dto.rateLimits ? { ...(provider.rateLimits ?? {}), ...dto.rateLimits } : provider.rateLimits,
    });

    const saved = await this.smsProviderRepository.save(provider);
    await this.upsertPlatformSmsAccount(saved.id, dto.username, dto.password);
    return saved;
  }

  private async upsertPlatformSmsAccount(
    providerId: string,
    username?: string,
    password?: string,
  ) {
    const nextUsername = username?.trim();
    const nextPassword = password?.trim();
    if (!nextUsername && !nextPassword) return;

    const platform = await this.companyRepository.findOne({
      where: { companyCode: PLATFORM_COMPANY_CODE },
    });
    if (!platform) {
      throw new BadRequestException('Platform firması (ADMIN) bulunamadı');
    }

    let account = await this.companySmsAccountRepository.findOne({
      where: { companyId: platform.id, providerId },
    });
    if (!account) {
      account = this.companySmsAccountRepository.create({
        companyId: platform.id,
        providerId,
        isActive: true,
        applyToSubAccounts: true,
        username: nextUsername || undefined,
      });
    } else {
      account.isActive = true;
      account.applyToSubAccounts = true;
      if (nextUsername) account.username = nextUsername;
    }
    account = await this.companySmsAccountRepository.save(account);
    if (nextPassword) {
      await this.credentialsService.store(
        platform.id,
        CredentialType.SMS_PASSWORD,
        'CompanySmsAccount',
        account.id,
        nextPassword,
      );
    }
  }
}
