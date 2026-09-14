import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { CreditsService } from './credits.service.js';
import { CreditCustomerQueryDto, CreditHistoryQueryDto } from './dto/credit-query.dto.js';
import { LoadCreditDto } from './dto/load-credit.dto.js';

@Controller('admin/credits')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DEALER)
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get('customers')
  findCustomers(
    @Query() query: CreditCustomerQueryDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.creditsService.findCustomers(query, user);
  }

  @Get('customers/:id/history')
  findHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: CreditHistoryQueryDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.creditsService.findHistory(id, query, user);
  }

  @Get('customers/:id')
  findCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.creditsService.findCustomer(id, user);
  }

  @Post()
  load(
    @Body() dto: LoadCreditDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.creditsService.load(dto, user);
  }
}
