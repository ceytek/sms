import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceList } from './entities/price-list.entity.js';
import { PriceListItem } from './entities/price-list-item.entity.js';
import { CompanyPriceList } from '../companies/entities/company-price-list.entity.js';
import { CreatePriceListDto } from './dto/create-price-list.dto.js';
import { UpdatePriceListDto } from './dto/update-price-list.dto.js';
import { PriceListItemDto } from './dto/price-list-item.dto.js';
import { Role } from '../../common/enums/role.enum.js';
import { PriceListType } from '../../common/enums/price-list-type.enum.js';

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PriceList)
    private readonly priceListRepository: Repository<PriceList>,
    @InjectRepository(PriceListItem)
    private readonly priceListItemRepository: Repository<PriceListItem>,
    @InjectRepository(CompanyPriceList)
    private readonly companyPriceListRepository: Repository<CompanyPriceList>,
  ) {}

  async findAllLists(user?: { id: string; role: string; companyId: string }) {
    const where: Record<string, unknown> = {};
    if (user?.role === Role.DEALER) {
      where.listType = PriceListType.CUSTOMER;
      where.ownerCompanyId = user.companyId;
    }
    const lists = await this.priceListRepository.find({
      where,
      order: { name: 'ASC' },
    });

    const listsWithCount = await Promise.all(
      lists.map(async (list) => {
        const assignmentCount = await this.companyPriceListRepository.count({
          where: { priceListId: list.id },
        });
        return { ...list, assignmentCount };
      }),
    );

    return listsWithCount;
  }

  async createList(
    dto: CreatePriceListDto,
    actor: { id: string; role: string; companyId: string } | string,
  ) {
    const createdBy = typeof actor === 'string' ? actor : actor.id;

    if (typeof actor !== 'string' && actor.role === Role.DEALER) {
      if (dto.listType !== PriceListType.CUSTOMER) {
        throw new ForbiddenException(
          'Bayiler yalnızca CUSTOMER tipinde fiyat listesi oluşturabilir',
        );
      }
    }

    const ownerCompanyId =
      typeof actor !== 'string' && actor.role === Role.DEALER
        ? actor.companyId
        : dto.ownerCompanyId;

    const priceList = this.priceListRepository.create({
      name: dto.name,
      listType: dto.listType,
      ownerCompanyId,
      currency: dto.currency ?? 'TRY',
      validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
      validTo: dto.validTo ? new Date(dto.validTo) : undefined,
      isActive: dto.isActive ?? true,
      createdBy,
    });

    return this.priceListRepository.save(priceList);
  }

  async updateList(id: string, dto: UpdatePriceListDto) {
    const priceList = await this.priceListRepository.findOne({ where: { id } });
    if (!priceList) {
      throw new NotFoundException('Fiyat listesi bulunamadı');
    }

    Object.assign(priceList, {
      name: dto.name ?? priceList.name,
      listType: dto.listType ?? priceList.listType,
      ownerCompanyId: dto.ownerCompanyId ?? priceList.ownerCompanyId,
      currency: dto.currency ?? priceList.currency,
      validFrom: dto.validFrom
        ? new Date(dto.validFrom)
        : priceList.validFrom,
      validTo: dto.validTo ? new Date(dto.validTo) : priceList.validTo,
      isActive: dto.isActive ?? priceList.isActive,
    });

    return this.priceListRepository.save(priceList);
  }

  async findListItems(priceListId: string) {
    await this.ensureListExists(priceListId);

    return this.priceListItemRepository.find({
      where: { priceListId },
      relations: ['product'],
      order: { product: { name: 'ASC' } },
    });
  }

  async bulkUpdateItems(priceListId: string, items: PriceListItemDto[]) {
    await this.ensureListExists(priceListId);

    await this.priceListItemRepository.delete({ priceListId });

    if (!items.length) {
      return [];
    }

    const entities = items.map((item) =>
      this.priceListItemRepository.create({
        priceListId,
        productId: item.productId,
        unitPrice: item.unitPrice,
      }),
    );

    return this.priceListItemRepository.save(entities);
  }

  async assignPriceList(
    companyId: string,
    priceListId: string,
    assignedBy?: string,
  ) {
    await this.ensureListExists(priceListId);

    const existing = await this.companyPriceListRepository.findOne({
      where: { companyId, priceListId },
    });

    if (existing) {
      return existing;
    }

    const assignment = this.companyPriceListRepository.create({
      companyId,
      priceListId,
      assignedBy,
    });

    return this.companyPriceListRepository.save(assignment);
  }

  async findListAssignments(priceListId: string) {
    const assignments = await this.companyPriceListRepository.find({
      where: { priceListId },
      relations: ['company'],
      order: { assignedAt: 'DESC' },
    });
    return assignments.map((a) => ({
      id: a.id,
      companyId: a.companyId,
      companyCode: a.company?.companyCode,
      companyName: a.company?.name,
      assignedAt: a.assignedAt,
    }));
  }

  private async ensureListExists(id: string) {
    const priceList = await this.priceListRepository.findOne({ where: { id } });
    if (!priceList) {
      throw new NotFoundException('Fiyat listesi bulunamadı');
    }
    return priceList;
  }
}
