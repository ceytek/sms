import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { OriginatorRestrictionsService } from './originator-restrictions.service.js';
import {
  BulkOriginatorRestrictionDto,
  CreateOriginatorRestrictionDto,
  OriginatorRestrictionQueryDto,
} from './dto/originator-restriction.dto.js';

@Controller('originator-restrictions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER, Role.DEALER, Role.ADMIN)
export class OriginatorRestrictionsController {
  constructor(private readonly restrictionsService: OriginatorRestrictionsService) {}

  @Get('originators')
  listOriginators(@CurrentUser() user: { id: string; companyId?: string }) {
    return this.restrictionsService.listOriginators(user);
  }

  @Get()
  list(
    @Query() query: OriginatorRestrictionQueryDto,
    @CurrentUser() user: { id: string; companyId?: string },
  ) {
    return this.restrictionsService.list(query, user);
  }

  @Post()
  create(
    @Body() dto: CreateOriginatorRestrictionDto,
    @CurrentUser() user: { id: string; companyId?: string },
  ) {
    return this.restrictionsService.create(dto, user);
  }

  @Post('bulk')
  createBulk(
    @Body() dto: BulkOriginatorRestrictionDto,
    @CurrentUser() user: { id: string; companyId?: string },
  ) {
    return this.restrictionsService.createBulk(dto, user);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; companyId?: string },
  ) {
    return this.restrictionsService.remove(id, user);
  }
}
