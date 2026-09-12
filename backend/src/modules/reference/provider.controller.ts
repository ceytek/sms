import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ReferenceService } from './reference.service.js';
import { CreateProviderDto } from './dto/create-provider.dto.js';
import { UpdateProviderDto } from './dto/update-provider.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';

@Controller('admin/providers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ProviderController {
  constructor(private readonly referenceService: ReferenceService) {}

  @Get()
  findAll() {
    return this.referenceService.findAllProviders();
  }

  @Post()
  create(@Body() dto: CreateProviderDto) {
    return this.referenceService.createProvider(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProviderDto,
  ) {
    return this.referenceService.updateProvider(id, dto);
  }

  @Get(':id/companies')
  findProviderCompanies(@Param('id', ParseUUIDPipe) id: string) {
    return this.referenceService.findProviderCompanies(id);
  }
}
