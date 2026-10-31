import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyService } from '../../companies/entities/company-service.entity.js';
import { isServiceTermExpired } from '../../companies/service-term.js';
import { FORM_SERVICE_CODE } from '../form.constants.js';

export type FormActor = {
  id: string;
  role: string;
  companyId?: string;
};

@Injectable()
export class FormAccessService {
  constructor(
    @InjectRepository(CompanyService)
    private readonly companyServices: Repository<CompanyService>,
  ) {}

  ownerCompanyId(actor: FormActor) {
    if (!actor.companyId) throw new ForbiddenException('Firma bilgisi bulunamadı');
    return actor.companyId;
  }

  async isEnabled(companyId: string) {
    const row = await this.companyServices
      .createQueryBuilder('assignment')
      .innerJoin('assignment.service', 'service')
      .where('assignment.companyId = :companyId', { companyId })
      .andWhere('service.code = :code', { code: FORM_SERVICE_CODE })
      .andWhere('assignment.isActive = true')
      .getOne();
    return Boolean(row) && !isServiceTermExpired(row?.endDate);
  }

  async status(actor: FormActor) {
    if (!actor.companyId) return { enabled: false };
    return { enabled: await this.isEnabled(actor.companyId) };
  }

  async assertEnabled(actor: FormActor) {
    const companyId = this.ownerCompanyId(actor);
    if (!(await this.isEnabled(companyId))) {
      throw new ForbiddenException('Form hizmeti bu firma için aktif değil');
    }
    return companyId;
  }
}
