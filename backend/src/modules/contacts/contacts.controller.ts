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
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { ContactsService } from './services/contacts.service.js';
import { CreateContactDto, RestrictContactDto, UpdateContactDto } from './dto/contact.dto.js';
import { ContactExportQueryDto, ContactQueryDto } from './dto/contact-query.dto.js';
import { ContactBulkActionDto } from './dto/import.dto.js';
import type { ContactActor } from './services/contact-access.service.js';

@Controller('contacts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get('summary')
  summary(@CurrentUser() user: ContactActor) {
    return this.contactsService.summary(user);
  }

  @Get('export')
  async export(
    @Query() query: ContactExportQueryDto,
    @CurrentUser() user: ContactActor,
  ) {
    const file = await this.contactsService.export(query, user);
    return new StreamableFile(file.buffer, {
      type: file.contentType,
      disposition: `attachment; filename="${file.filename}"`,
    });
  }

  @Get()
  list(@Query() query: ContactQueryDto, @CurrentUser() user: ContactActor) {
    return this.contactsService.list(query, user);
  }

  @Post('bulk-action')
  bulkAction(@Body() dto: ContactBulkActionDto, @CurrentUser() user: ContactActor) {
    return this.contactsService.bulkAction(dto, user);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: ContactActor) {
    return this.contactsService.getOne(id, user);
  }

  @Post('restrict')
  restrict(@Body() dto: RestrictContactDto, @CurrentUser() user: ContactActor) {
    return this.contactsService.restrict(dto, user);
  }

  @Post()
  create(@Body() dto: CreateContactDto, @CurrentUser() user: ContactActor) {
    return this.contactsService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
    @CurrentUser() user: ContactActor,
  ) {
    return this.contactsService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: ContactActor) {
    return this.contactsService.remove(id, user);
  }
}
