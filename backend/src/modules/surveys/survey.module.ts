import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { Company } from '../companies/entities/company.entity.js';
import { CompanyService } from '../companies/entities/company-service.entity.js';
import { KvkkSetting } from '../kvkk/entities/kvkk-setting.entity.js';
import { MessagingModule } from '../messaging/messaging.module.js';
import { SurveyAnswer } from './entities/survey-answer.entity.js';
import { SurveyOption } from './entities/survey-option.entity.js';
import { SurveyQuestion } from './entities/survey-question.entity.js';
import { SurveyRecipient } from './entities/survey-recipient.entity.js';
import { SurveyResponse } from './entities/survey-response.entity.js';
import { SurveySetting } from './entities/survey-setting.entity.js';
import { SurveyTemplate } from './entities/survey-template.entity.js';
import { Survey } from './entities/survey.entity.js';
import { SurveyPublicController } from './survey-public.controller.js';
import { SurveyController, SurveyWorkspaceController } from './survey.controller.js';
import { SurveyEnabledGuard } from './survey-enabled.guard.js';
import { SurveyAccessService } from './services/survey-access.service.js';
import { SurveyAnalyticsService } from './services/survey-analytics.service.js';
import { SurveyDistributionService } from './services/survey-distribution.service.js';
import { SurveyPublicService } from './services/survey-public.service.js';
import { SurveyService } from './services/survey.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Survey,
      SurveyQuestion,
      SurveyOption,
      SurveyRecipient,
      SurveyResponse,
      SurveyAnswer,
      SurveyTemplate,
      SurveySetting,
      CompanyService,
      Company,
      KvkkSetting,
    ]),
    AuthModule,
    AuditModule,
    MessagingModule,
  ],
  controllers: [SurveyPublicController, SurveyController, SurveyWorkspaceController],
  providers: [
    SurveyAccessService,
    SurveyService,
    SurveyPublicService,
    SurveyDistributionService,
    SurveyAnalyticsService,
    SurveyEnabledGuard,
  ],
})
export class SurveyModule {}
