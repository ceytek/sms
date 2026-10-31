import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyService } from '../../companies/entities/company-service.entity.js';
import { isServiceTermExpired } from '../../companies/service-term.js';
import { SURVEY_SERVICE_CODE } from '../survey.constants.js';

export type SurveyActor = {
  id: string;
  role: string;
  companyId?: string;
};

@Injectable()
export class SurveyAccessService {
  constructor(
    @InjectRepository(CompanyService)
    private readonly companyServices: Repository<CompanyService>,
  ) {}

  ownerCompanyId(actor: SurveyActor) {
    if (!actor.companyId) throw new ForbiddenException('Firma bilgisi bulunamadı');
    return actor.companyId;
  }

  async isEnabled(companyId: string) {
    const row = await this.companyServices
      .createQueryBuilder('assignment')
      .innerJoin('assignment.service', 'service')
      .where('assignment.companyId = :companyId', { companyId })
      .andWhere('service.code = :code', { code: SURVEY_SERVICE_CODE })
      .andWhere('assignment.isActive = true')
      .getOne();
    return Boolean(row) && !isServiceTermExpired(row?.endDate);
  }

  async status(actor: SurveyActor) {
    if (!actor.companyId) return { enabled: false };
    return { enabled: await this.isEnabled(actor.companyId) };
  }

  async assertEnabled(actor: SurveyActor) {
    const companyId = this.ownerCompanyId(actor);
    if (!(await this.isEnabled(companyId))) {
      throw new ForbiddenException('Anket hizmeti bu firma için aktif değil');
    }
    return companyId;
  }
}
