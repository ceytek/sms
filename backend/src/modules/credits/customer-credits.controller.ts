import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { CreditsService } from './credits.service.js';

@Controller('credits')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class CustomerCreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get('me')
  me(@CurrentUser() user: { id: string; role: string; companyId: string }) {
    return this.creditsService.findMine(user);
  }
}
