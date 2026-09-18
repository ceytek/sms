import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { KvkkEnabledGuard } from './kvkk-enabled.guard.js';
import { KvkkFormsService } from './services/kvkk-forms.service.js';
import { CreateKvkkFormDto, CreateKvkkFormLinkDto, UpdateKvkkFormDto } from './dto/form.dto.js';
import type { KvkkActor } from './services/kvkk-access.service.js';

@Controller('kvkk/forms')
@UseGuards(JwtAuthGuard, RolesGuard, KvkkEnabledGuard)
@Roles(Role.CUSTOMER)
export class KvkkFormsController {
  constructor(private readonly formsService: KvkkFormsService) {}

  @Get()
  list(@CurrentUser() user: KvkkActor) {
    return this.formsService.list(user);
  }

  @Post()
  create(@Body() dto: CreateKvkkFormDto, @CurrentUser() user: KvkkActor) {
    return this.formsService.create(dto, user);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: KvkkActor) {
    return this.formsService.getOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKvkkFormDto,
    @CurrentUser() user: KvkkActor,
  ) {
    return this.formsService.update(id, dto, user);
  }

  @Post(':id/links')
  createLink(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateKvkkFormLinkDto,
    @CurrentUser() user: KvkkActor,
  ) {
    return this.formsService.createLink(id, dto, user);
  }
}
