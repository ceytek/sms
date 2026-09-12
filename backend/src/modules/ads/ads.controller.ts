import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { AdsService } from './ads.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';

@Controller('admin/ads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DEALER)
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get('price-lists/:id')
  createPriceListAd(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.adsService.createPriceListAd(id, user);
  }
}
