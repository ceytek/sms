import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { CompaniesService } from './companies.service.js';

@Controller('company-services')
@UseGuards(JwtAuthGuard)
export class MyCompanyServicesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('mine')
  mine(@CurrentUser() user: { id: string; companyId?: string }) {
    return this.companiesService.listMyServices(user);
  }
}
