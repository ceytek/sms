import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { KvkkEnabledGuard } from './kvkk-enabled.guard.js';
import { KvkkQrService } from './services/kvkk-qr.service.js';
import { CreateKvkkQrDto, UpdateKvkkQrDto } from './dto/qr.dto.js';
import type { KvkkActor } from './services/kvkk-access.service.js';

@Controller('kvkk/qr')
@UseGuards(JwtAuthGuard, RolesGuard, KvkkEnabledGuard)
@Roles(Role.CUSTOMER)
export class KvkkQrController {
  constructor(private readonly qrService: KvkkQrService) {}

  @Get()
  list(@CurrentUser() user: KvkkActor) {
    return this.qrService.list(user);
  }

  @Post()
  create(@Body() dto: CreateKvkkQrDto, @CurrentUser() user: KvkkActor) {
    return this.qrService.create(dto, user);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: KvkkActor) {
    return this.qrService.getOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKvkkQrDto,
    @CurrentUser() user: KvkkActor,
  ) {
    return this.qrService.update(id, dto, user);
  }
}
