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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { FormEnabledGuard } from './form-enabled.guard.js';
import { FormService } from './services/form.service.js';
import { FormAnalyticsService } from './services/form-analytics.service.js';
import { FormDistributionService } from './services/form-distribution.service.js';
import { FormAccessService, type FormActor } from './services/form-access.service.js';
import {
  CreateFormTemplateDto,
  DistributeFormDto,
  SaveFieldsDto,
  SubmissionQueryDto,
  UpdateSubmissionStatusDto,
  UpsertFormDto,
} from './dto/form.dto.js';

@Controller('forms')
@UseGuards(JwtAuthGuard, RolesGuard, FormEnabledGuard)
@Roles(Role.CUSTOMER)
export class FormController {
  constructor(
    private readonly formService: FormService,
    private readonly analytics: FormAnalyticsService,
    private readonly distribution: FormDistributionService,
  ) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: FormActor) {
    return this.formService.dashboard(user.companyId!);
  }

  @Get()
  list(@CurrentUser() user: FormActor) {
    return this.formService.list(user.companyId!);
  }

  @Get('templates')
  templates(@CurrentUser() user: FormActor) {
    return this.formService.templatesFor(user.companyId!);
  }

  @Post('templates')
  createTemplate(@Body() dto: CreateFormTemplateDto, @CurrentUser() user: FormActor) {
    return this.formService.createTemplate(user, user.companyId!, dto);
  }

  @Delete('templates/:id')
  removeTemplate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: FormActor) {
    return this.formService.removeTemplate(user, user.companyId!, id);
  }

  @Post('from-template/:templateId')
  createFromTemplate(@Param('templateId', ParseUUIDPipe) templateId: string, @CurrentUser() user: FormActor) {
    return this.formService.createFromTemplate(user, user.companyId!, templateId);
  }

  @Get('submissions')
  submissions(@Query() query: SubmissionQueryDto, @CurrentUser() user: FormActor) {
    return this.analytics.listSubmissions(user.companyId!, query);
  }

  @Get('submissions/export')
  async exportSubmissions(@Query() query: SubmissionQueryDto, @CurrentUser() user: FormActor, @Res() res: Response) {
    const result = await this.analytics.exportSubmissions(user.companyId!, query);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
    res.send(result.buffer);
  }

  @Get('submissions/:id')
  getSubmission(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: FormActor) {
    return this.analytics.getSubmission(user.companyId!, id);
  }

  @Patch('submissions/:id/status')
  updateSubmissionStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubmissionStatusDto,
    @CurrentUser() user: FormActor,
  ) {
    return this.analytics.updateSubmissionStatus(user.companyId!, id, dto, user);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: FormActor) {
    return this.formService.get(user.companyId!, id);
  }

  @Post()
  create(@Body() dto: UpsertFormDto, @CurrentUser() user: FormActor) {
    return this.formService.create(user, user.companyId!, dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpsertFormDto, @CurrentUser() user: FormActor) {
    return this.formService.update(user, user.companyId!, id, dto);
  }

  @Post(':id/fields')
  saveFields(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SaveFieldsDto, @CurrentUser() user: FormActor) {
    return this.formService.saveFields(user, user.companyId!, id, dto);
  }

  @Post(':id/publish')
  publish(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: FormActor) {
    return this.formService.publish(user, user.companyId!, id);
  }

  @Patch(':id/status')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { status: 'PASSIVE' | 'ACTIVE' | 'ARCHIVED' },
    @CurrentUser() user: FormActor,
  ) {
    return this.formService.setStatus(user, user.companyId!, id, dto.status);
  }

  @Post(':id/copy')
  copy(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: FormActor) {
    return this.formService.copy(user, user.companyId!, id);
  }

  @Post(':id/distribute')
  distribute(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DistributeFormDto, @CurrentUser() user: FormActor) {
    return this.distribution.distribute(user, user.companyId!, id, dto);
  }

  @Get(':id/qr')
  qr(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: FormActor) {
    return this.distribution.qr(user.companyId!, id);
  }
}

@Controller('form-status')
@UseGuards(JwtAuthGuard)
export class FormWorkspaceController {
  constructor(private readonly access: FormAccessService) {}

  @Get()
  status(@CurrentUser() user: FormActor) {
    return this.access.status(user);
  }
}
