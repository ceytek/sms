import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { KvkkEnabledGuard } from './kvkk-enabled.guard.js';
import { KvkkConsentsService } from './services/kvkk-consents.service.js';
import { KvkkConsentQueryDto } from './dto/consent.dto.js';
import type { KvkkActor } from './services/kvkk-access.service.js';

@Controller('kvkk/consents')
@UseGuards(JwtAuthGuard, RolesGuard, KvkkEnabledGuard)
@Roles(Role.CUSTOMER)
export class KvkkConsentsController {
  constructor(private readonly consentsService: KvkkConsentsService) {}

  @Get()
  list(@Query() query: KvkkConsentQueryDto, @CurrentUser() user: KvkkActor) {
    return this.consentsService.list(query, user);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: KvkkActor) {
    return this.consentsService.getOne(id, user);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: KvkkActor) {
    return this.consentsService.cancel(id, user);
  }
}
