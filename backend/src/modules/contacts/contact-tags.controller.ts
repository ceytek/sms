import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { ContactTagsService } from './services/contact-tags.service.js';
import { CreateContactTagDto, UpdateContactTagDto } from './dto/group-tag.dto.js';
import type { ContactActor } from './services/contact-access.service.js';

@Controller('contact-tags')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class ContactTagsController {
  constructor(private readonly tagsService: ContactTagsService) {}

  @Get()
  list(@CurrentUser() user: ContactActor) {
    return this.tagsService.list(user);
  }

  @Post()
  create(@Body() dto: CreateContactTagDto, @CurrentUser() user: ContactActor) {
    return this.tagsService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactTagDto,
    @CurrentUser() user: ContactActor,
  ) {
    return this.tagsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: ContactActor) {
    return this.tagsService.remove(id, user);
  }
}
