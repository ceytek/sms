import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/role.enum.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import {
  DistributeSurveyDto,
  PublishSurveyDto,
  ResponseQueryDto,
  CreateTemplateDto,
  SaveQuestionsDto,
  UpdateSurveySettingsDto,
  UpsertSurveyDto,
} from './dto/survey.dto.js';
import { SurveyEnabledGuard } from './survey-enabled.guard.js';
import { SurveyAccessService, type SurveyActor } from './services/survey-access.service.js';
import { SurveyAnalyticsService } from './services/survey-analytics.service.js';
import { SurveyDistributionService } from './services/survey-distribution.service.js';
import { SurveyService } from './services/survey.service.js';

@Controller('surveys')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class SurveyController {
  constructor(
    private readonly access: SurveyAccessService,
    private readonly surveys: SurveyService,
    private readonly distribution: SurveyDistributionService,
    private readonly analytics: SurveyAnalyticsService,
  ) {}

  @Get('status')
  status(@CurrentUser() user: SurveyActor) {
    return this.access.status(user);
  }
}

@Controller('surveys')
@UseGuards(JwtAuthGuard, RolesGuard, SurveyEnabledGuard)
@Roles(Role.CUSTOMER)
export class SurveyWorkspaceController {
  constructor(
    private readonly access: SurveyAccessService,
    private readonly surveys: SurveyService,
    private readonly distribution: SurveyDistributionService,
    private readonly analytics: SurveyAnalyticsService,
  ) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: SurveyActor) {
    return this.analytics.dashboard(this.access.ownerCompanyId(user));
  }

  @Get('templates')
  templates(@CurrentUser() user: SurveyActor) {
    return this.surveys.templatesFor(this.access.ownerCompanyId(user));
  }

  @Post('templates')
  createTemplate(@CurrentUser() user: SurveyActor, @Body() dto: CreateTemplateDto) {
    return this.surveys.createTemplate(user, this.access.ownerCompanyId(user), dto);
  }

  @Delete('templates/:templateId')
  removeTemplate(@CurrentUser() user: SurveyActor, @Param('templateId', ParseUUIDPipe) templateId: string) {
    return this.surveys.removeTemplate(user, this.access.ownerCompanyId(user), templateId);
  }

  @Post('from-template/:templateId')
  fromTemplate(@CurrentUser() user: SurveyActor, @Param('templateId', ParseUUIDPipe) templateId: string) {
    return this.surveys.createFromTemplate(user, this.access.ownerCompanyId(user), templateId);
  }

  @Get('settings')
  settings(@CurrentUser() user: SurveyActor) {
    return this.surveys.getSettings(this.access.ownerCompanyId(user));
  }

  @Patch('settings')
  updateSettings(@CurrentUser() user: SurveyActor, @Body() dto: UpdateSurveySettingsDto) {
    return this.surveys.updateSettings(this.access.ownerCompanyId(user), dto);
  }

  @Get('responses')
  responses(@CurrentUser() user: SurveyActor, @Query() query: ResponseQueryDto) {
    return this.analytics.responses(this.access.ownerCompanyId(user), query);
  }

  @Get('responses/export')
  exportResponses(
    @CurrentUser() user: SurveyActor,
    @Query() query: ResponseQueryDto,
    @Res() res: Response,
  ) {
    return this.analytics.exportResponses(this.access.ownerCompanyId(user), query, query.format === 'xlsx' ? 'xlsx' : 'csv', res);
  }

  @Get('responses/:responseId')
  responseDetail(@CurrentUser() user: SurveyActor, @Param('responseId', ParseUUIDPipe) responseId: string) {
    return this.analytics.responseDetail(this.access.ownerCompanyId(user), responseId);
  }

  @Post('responses/:responseId/cancel')
  cancelResponse(@CurrentUser() user: SurveyActor, @Param('responseId', ParseUUIDPipe) responseId: string) {
    return this.analytics.cancelResponse(this.access.ownerCompanyId(user), user.id, responseId);
  }

  @Get()
  list(@CurrentUser() user: SurveyActor) {
    return this.surveys.list(this.access.ownerCompanyId(user));
  }

  @Post()
  create(@CurrentUser() user: SurveyActor, @Body() dto: UpsertSurveyDto) {
    return this.surveys.create(user, this.access.ownerCompanyId(user), dto);
  }

  @Get(':id/funnel')
  funnel(@CurrentUser() user: SurveyActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.analytics.funnel(this.access.ownerCompanyId(user), id);
  }

  @Get(':id/results')
  results(@CurrentUser() user: SurveyActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.analytics.results(this.access.ownerCompanyId(user), id);
  }

  @Get(':id/qr')
  async qr(
    @CurrentUser() user: SurveyActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    const { url } = await this.distribution.qr(this.access.ownerCompanyId(user), id);
    const QRCode = await import('qrcode');
    if (format === 'png') {
      const buffer = await QRCode.toBuffer(url, { type: 'png', width: 640, margin: 1 });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', 'attachment; filename="anket-qr.png"');
      res.end(buffer);
      return;
    }
    const svg = await QRCode.toString(url, { type: 'svg', margin: 1 });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Content-Disposition', 'attachment; filename="anket-qr.svg"');
    res.end(svg);
  }

  @Get(':id/export')
  exportFile(
    @CurrentUser() user: SurveyActor,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    return this.analytics.export(this.access.ownerCompanyId(user), id, format === 'xlsx' ? 'xlsx' : 'csv', res);
  }

  @Get(':id')
  get(@CurrentUser() user: SurveyActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.surveys.get(this.access.ownerCompanyId(user), id);
  }

  @Patch(':id')
  update(@CurrentUser() user: SurveyActor, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpsertSurveyDto) {
    return this.surveys.update(user, this.access.ownerCompanyId(user), id, dto);
  }

  @Put(':id/questions')
  questions(@CurrentUser() user: SurveyActor, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SaveQuestionsDto) {
    return this.surveys.saveQuestions(user, this.access.ownerCompanyId(user), id, dto);
  }

  @Post(':id/publish')
  publish(@CurrentUser() user: SurveyActor, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PublishSurveyDto) {
    return this.surveys.publish(user, this.access.ownerCompanyId(user), id).then(async (survey) => {
      if (dto.send && survey.status === 'ACTIVE' && survey.originatorId && survey.audience) {
        const sources = Array.isArray((survey.audience as { sources?: unknown[] }).sources)
          ? (survey.audience as { sources: DistributeSurveyDto['sources'] }).sources
          : [];
        if (sources?.length) {
          const sent = await this.distribution.distribute(user, this.access.ownerCompanyId(user), id, {
            originatorId: survey.originatorId,
            body: survey.smsBody || '{survey_link}',
            sources,
          }, 'SEND');
          return { ...survey, delivery: sent };
        }
      }
      return survey;
    });
  }

  @Post(':id/close')
  close(@CurrentUser() user: SurveyActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.surveys.close(user, this.access.ownerCompanyId(user), id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: SurveyActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.surveys.cancel(user, this.access.ownerCompanyId(user), id);
  }

  @Post(':id/copy')
  copy(@CurrentUser() user: SurveyActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.surveys.copy(user, this.access.ownerCompanyId(user), id);
  }

  @Post(':id/distribute')
  distribute(@CurrentUser() user: SurveyActor, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DistributeSurveyDto) {
    return this.distribution.distribute(user, this.access.ownerCompanyId(user), id, dto, 'SEND');
  }

  @Post(':id/remind')
  remind(@CurrentUser() user: SurveyActor, @Param('id', ParseUUIDPipe) id: string, @Body() dto: DistributeSurveyDto) {
    return this.distribution.distribute(user, this.access.ownerCompanyId(user), id, { ...dto, sources: dto.sources ?? [] }, 'REMINDER');
  }

  @Delete(':id')
  remove(@CurrentUser() user: SurveyActor, @Param('id', ParseUUIDPipe) id: string) {
    return this.surveys.remove(user, this.access.ownerCompanyId(user), id);
  }
}
