import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyService } from '../../companies/entities/company-service.entity.js';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { normalizeTrMobile } from '../../../common/phone/normalize-tr-mobile.js';

export const KVKK_SERVICE_CODE = 'KVKK';

export type KvkkActor = {
  id: string;
  role: string;
  companyId?: string;
  impersonatedBy?: string;
};

@Injectable()
export class KvkkAccessService {
  constructor(
    @InjectRepository(CompanyService)
    private readonly companyServiceRepository: Repository<CompanyService>,
    private readonly configService: ConfigService,
  ) {}

  ownerCompanyId(actor: KvkkActor): string {
    if (!actor.companyId) {
      throw new ForbiddenException('Firma bilgisi bulunamadı');
    }
    return actor.companyId;
  }

  async isEnabled(ownerCompanyId: string) {
    const row = await this.companyServiceRepository
      .createQueryBuilder('assignment')
      .innerJoin('assignment.service', 'service')
      .where('assignment.companyId = :ownerCompanyId', { ownerCompanyId })
      .andWhere('assignment.isActive = true')
      .andWhere('service.code = :code', { code: KVKK_SERVICE_CODE })
      .getOne();
    return Boolean(row);
  }

  async assertEnabled(actor: KvkkActor) {
    const ownerCompanyId = this.ownerCompanyId(actor);
    if (!(await this.isEnabled(ownerCompanyId))) {
      throw new ForbiddenException('KVKK hizmeti bu firma için aktif değil');
    }
    return ownerCompanyId;
  }

  requirePhone(raw: string) {
    const normalized = normalizeTrMobile(raw);
    if (!normalized) {
      throw new BadRequestException('Geçerli bir cep telefonu girin');
    }
    return { mobilePhone: raw.trim(), normalizedPhone: normalized };
  }

  publicOrigin() {
    return (this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(/\/$/, '');
  }

  publicFormUrl(token: string) {
    return `${this.publicOrigin()}/p/kvkk/${token}`;
  }

  newToken() {
    return randomBytes(24).toString('base64url');
  }
}
