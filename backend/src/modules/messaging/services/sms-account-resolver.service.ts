import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Company } from '../../companies/entities/company.entity.js';
import { CompanySmsAccount } from '../../companies/entities/company-sms-account.entity.js';

const MAX_HOPS = 8;
const PLATFORM_COMPANY_CODE = 'ADMIN';

export function nextSmsAccountOwnerId(company: {
  dealerCompanyId?: string | null;
  parentCompanyId?: string | null;
}) {
  return company.dealerCompanyId || company.parentCompanyId || null;
}

@Injectable()
export class SmsAccountResolverService {
  constructor(private readonly dataSource: DataSource) {}

  async resolve(companyId: string): Promise<CompanySmsAccount | null> {
    const ownUsable = await this.usableAccount(companyId);
    if (ownUsable) return ownUsable;

    const preferredProviderId = (await this.anyActiveAccount(companyId))?.providerId;
    const seen = new Set<string>([companyId]);
    let currentId = await this.nextOwner(companyId);
    let hops = 0;

    while (currentId && !seen.has(currentId) && hops < MAX_HOPS) {
      seen.add(currentId);
      hops += 1;
      const inherited = await this.usableAccount(currentId, preferredProviderId);
      if (inherited) return inherited;
      currentId = await this.nextOwner(currentId);
    }

    const platformId = await this.platformCompanyId();
    if (platformId && !seen.has(platformId)) {
      return this.usableAccount(platformId, preferredProviderId);
    }
    return null;
  }

  private async platformCompanyId() {
    const company = await this.dataSource.getRepository(Company).findOne({
      where: { companyCode: PLATFORM_COMPANY_CODE },
      select: ['id'],
    });
    return company?.id ?? null;
  }

  private async usableAccount(companyId: string, providerId?: string) {
    const qb = this.dataSource
      .getRepository(CompanySmsAccount)
      .createQueryBuilder('account')
      .where('account.companyId = :companyId', { companyId })
      .andWhere('account.isActive = true')
      .andWhere("NULLIF(BTRIM(account.username), '') IS NOT NULL")
      .orderBy('account.createdAt', 'ASC');
    if (providerId) {
      qb.andWhere('account.providerId = :providerId', { providerId });
    }
    const match = await qb.getOne();
    if (match) return match;
    if (!providerId) return null;
    return this.dataSource
      .getRepository(CompanySmsAccount)
      .createQueryBuilder('account')
      .where('account.companyId = :companyId', { companyId })
      .andWhere('account.isActive = true')
      .andWhere("NULLIF(BTRIM(account.username), '') IS NOT NULL")
      .orderBy('account.createdAt', 'ASC')
      .getOne();
  }

  private anyActiveAccount(companyId: string) {
    return this.dataSource.getRepository(CompanySmsAccount).findOne({
      where: { companyId, isActive: true },
      order: { createdAt: 'ASC' },
    });
  }

  private async nextOwner(companyId: string) {
    const company = await this.dataSource.getRepository(Company).findOne({
      where: { id: companyId },
      select: ['id', 'dealerCompanyId', 'parentCompanyId'],
    });
    if (!company) return null;
    return nextSmsAccountOwnerId(company);
  }
}
