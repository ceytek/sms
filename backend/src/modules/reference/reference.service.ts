import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from './entities/city.entity.js';
import { District } from './entities/district.entity.js';
import { SmsProvider } from './entities/sms-provider.entity.js';
import { Service } from './entities/service.entity.js';
import { Product } from './entities/product.entity.js';
import { PriceList } from '../pricing/entities/price-list.entity.js';
import { CompanySmsAccount } from '../companies/entities/company-sms-account.entity.js';
import { CreateProviderDto } from './dto/create-provider.dto.js';
import { UpdateProviderDto } from './dto/update-provider.dto.js';

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
    @InjectRepository(PriceList)
    private readonly priceListRepository: Repository<PriceList>,
    @InjectRepository(CompanySmsAccount)
    private readonly companySmsAccountRepository: Repository<CompanySmsAccount>,
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

  async findAllProviders() {
    const providers = await this.smsProviderRepository.find({
      order: { name: 'ASC' },
    });

    const providersWithCount = await Promise.all(
      providers.map(async (p) => {
        const companyCount = await this.companySmsAccountRepository.count({
          where: { providerId: p.id, isActive: true },
        });
        return { ...p, companyCount };
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
    });

    return this.smsProviderRepository.save(provider);
  }
}
