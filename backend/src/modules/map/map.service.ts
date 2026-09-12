import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../companies/entities/company.entity.js';
import { Role } from '../../common/enums/role.enum.js';
import { coordinatesForPlate } from './city-coordinates.js';

@Injectable()
export class MapService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async findPoints(user: { id: string; role: string; companyId: string }) {
    const qb = this.companyRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.city', 'city')
      .where('company.deleted_at IS NULL')
      .andWhere('company.company_code != :adminCode', { adminCode: 'ADMIN' });

    if (user.role === Role.DEALER) {
      qb.andWhere('company.dealer_company_id = :dealerCompanyId', {
        dealerCompanyId: user.companyId,
      });
    } else {
      qb.andWhere(
        '(company.is_dealer = true OR company.dealer_company_id IS NULL)',
      );
    }

    const companies = await qb.orderBy('company.name', 'ASC').getMany();
    const cityCounts = new Map<number, number>();

    const points = companies.flatMap((company) => {
      const coords = coordinatesForPlate(company.city?.plateCode);
      if (!coords) return [];

      const cityId = company.cityId ?? 0;
      const index = cityCounts.get(cityId) ?? 0;
      cityCounts.set(cityId, index + 1);

      const angle = (index * 2.4) % (Math.PI * 2);
      const radius = 0.035 + index * 0.012;

      return [
        {
          id: company.id,
          companyCode: company.companyCode,
          name: company.name,
          isDealer: company.isDealer,
          status: company.status,
          cityId: company.cityId,
          cityName: company.city?.name,
          plateCode: company.city?.plateCode,
          email: company.email,
          phone: company.phone ?? company.mobile,
          lat: coords.lat + Math.sin(angle) * radius,
          lng: coords.lng + Math.cos(angle) * radius,
        },
      ];
    });

    const unlocatedCount = companies.length - points.length;
    const dealerCount = points.filter((p) => p.isDealer).length;

    return {
      points,
      summary: {
        total: points.length,
        dealers: dealerCount,
        customers: points.length - dealerCount,
        cities: cityCounts.size,
        unlocated: unlocatedCount,
      },
    };
  }
}
