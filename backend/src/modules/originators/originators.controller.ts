import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { OriginatorsService } from './originators.service.js';
import { OriginatorQueryDto, OriginatorCompanyQueryDto } from './dto/originator-query.dto.js';
import { CreateOriginatorRequestDto } from './dto/create-originator-request.dto.js';
import { CreateOwnOriginatorDto } from './dto/create-own-originator.dto.js';
import { UpdateOriginatorStatusDto } from './dto/update-originator-status.dto.js';
import { CreateBannedOriginatorDto } from './dto/create-banned-originator.dto.js';

@Controller('admin/originators')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DEALER)
export class OriginatorsController {
  constructor(private readonly originatorsService: OriginatorsService) {}

  @Get()
  findAll(
    @Query() query: OriginatorQueryDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.originatorsService.findAll(query, user);
  }

  @Get('companies')
  findCompanies(
    @Query() query: OriginatorCompanyQueryDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.originatorsService.findCompanies(query, user);
  }

  @Get('pending')
  @Roles(Role.ADMIN)
  findPending(
    @Query('dealerId') dealerId: string | undefined,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.originatorsService.findPendingRequests(user, dealerId || undefined);
  }

  @Get('mine')
  @Roles(Role.ADMIN)
  listMine(@CurrentUser() user: { id: string; role: string; companyId: string }) {
    return this.originatorsService.listMine(user);
  }

  @Post('mine')
  @Roles(Role.ADMIN)
  createMine(
    @Body() dto: CreateOwnOriginatorDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.originatorsService.createMine(dto, user);
  }

  @Post()
  create(
    @Body() dto: CreateOriginatorRequestDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.originatorsService.createRequest(dto, user);
  }

  @Get('banned')
  @Roles(Role.ADMIN)
  listBanned(@CurrentUser() user: { id: string; role: string; companyId: string }) {
    return this.originatorsService.listBanned(user);
  }

  @Post('banned')
  @Roles(Role.ADMIN)
  addBanned(
    @Body() dto: CreateBannedOriginatorDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.originatorsService.addBanned(dto, user);
  }

  @Delete('banned/:id')
  @Roles(Role.ADMIN)
  removeBanned(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.originatorsService.removeBanned(id, user);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOriginatorStatusDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.originatorsService.updateStatus(id, dto.status, user);
  }

  @Post(':id/ban')
  @Roles(Role.ADMIN)
  banExisting(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.originatorsService.banExisting(id, user);
  }
}
