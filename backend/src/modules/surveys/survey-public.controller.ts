import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { StartSurveyDto, SubmitSurveyDto } from './dto/survey.dto.js';
import { SurveyPublicService } from './services/survey-public.service.js';

@Controller('surveys/public')
export class SurveyPublicController {
  constructor(private readonly surveys: SurveyPublicService) {}

  @Get('s/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.surveys.bySlug(slug);
  }

  @Get('r/:token')
  byToken(@Param('token') token: string) {
    return this.surveys.byToken(token);
  }

  @Post('s/:slug/start')
  startSlug(@Param('slug') slug: string, @Body() dto: StartSurveyDto) {
    return this.surveys.start(null, slug, dto);
  }

  @Post('r/:token/start')
  startToken(@Param('token') token: string, @Body() dto: StartSurveyDto) {
    return this.surveys.start(token, null, dto);
  }

  @Post('s/:slug/responses')
  submitSlug(@Param('slug') slug: string, @Body() dto: SubmitSurveyDto) {
    return this.surveys.submit(null, slug, dto);
  }

  @Post('r/:token/responses')
  submitToken(@Param('token') token: string, @Body() dto: SubmitSurveyDto) {
    return this.surveys.submit(token, null, dto);
  }
}
