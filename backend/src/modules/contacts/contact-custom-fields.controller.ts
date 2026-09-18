import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { ContactCustomFieldsService } from './services/contact-custom-fields.service.js';
import { CreateContactCustomFieldDto, UpdateContactCustomFieldDto } from './dto/custom-field.dto.js';
import type { ContactActor } from './services/contact-access.service.js';

@Controller('contact-custom-fields')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class ContactCustomFieldsController {
  constructor(private readonly fieldsService: ContactCustomFieldsService) {}

  @Get()
  list(@CurrentUser() user: ContactActor) {
    return this.fieldsService.list(user);
  }

  @Post()
  create(@Body() dto: CreateContactCustomFieldDto, @CurrentUser() user: ContactActor) {
    return this.fieldsService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactCustomFieldDto,
    @CurrentUser() user: ContactActor,
  ) {
    return this.fieldsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: ContactActor) {
    return this.fieldsService.remove(id, user);
  }
}
