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
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CompaniesService } from './companies.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { CompanyQueryDto } from './dto/company-query.dto.js';
import { UpdateCompanyStatusDto } from './dto/update-company-status.dto.js';
import { AddCompanyServiceDto } from './dto/add-company-service.dto.js';
import { CreateContactDto } from './dto/create-company.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';

@Controller('admin/companies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DEALER)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  findAll(
    @Query() query: CompanyQueryDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
  ) {
    return this.companiesService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.companiesService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() user: { id: string; role: string; companyId: string },
    @Req() req: Request,
  ) {
    return this.companiesService.create(dto, user, req.ip);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ) {
    return this.companiesService.update(id, dto, user.id, req.ip);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyStatusDto,
    @CurrentUser() user: { id: string },
    @Req() req: Request,
  ) {
    return this.companiesService.updateStatus(
      id,
      dto.status,
      user.id,
      req.ip,
    );
  }

  @Post(':id/services')
  addService(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCompanyServiceDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.companiesService.addService(id, dto.serviceId, user.id);
  }

  @Post(':id/contacts')
  addContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateContactDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.companiesService.addContact(id, dto, user.id);
  }

  @Delete(':id/contacts/:contactId')
  removeContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    return this.companiesService.removeContact(id, contactId);
  }

  @Get(':id/users')
  findCompanyUsers(@Param('id', ParseUUIDPipe) id: string) {
    return this.companiesService.findCompanyUsers(id);
  }

  @Post(':id/users')
  createCompanyUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { username: string; password: string },
  ) {
    return this.companiesService.createCompanyUser(id, dto.username, dto.password);
  }

  @Patch(':id/users/:userId/password')
  resetUserPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: { password: string },
  ) {
    return this.companiesService.resetUserPassword(id, userId, dto.password);
  }
}
