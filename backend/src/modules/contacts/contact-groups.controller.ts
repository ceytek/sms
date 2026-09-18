import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { ContactGroupsService } from './services/contact-groups.service.js';
import { CreateContactGroupDto, UpdateContactGroupDto } from './dto/group-tag.dto.js';
import type { ContactActor } from './services/contact-access.service.js';

@Controller('contact-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class ContactGroupsController {
  constructor(private readonly groupsService: ContactGroupsService) {}

  @Get()
  list(@CurrentUser() user: ContactActor) {
    return this.groupsService.list(user);
  }

  @Post()
  create(@Body() dto: CreateContactGroupDto, @CurrentUser() user: ContactActor) {
    return this.groupsService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactGroupDto,
    @CurrentUser() user: ContactActor,
  ) {
    return this.groupsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: ContactActor) {
    return this.groupsService.remove(id, user);
  }
}
