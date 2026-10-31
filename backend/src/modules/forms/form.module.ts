import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { Company } from '../companies/entities/company.entity.js';
import { CompanyService } from '../companies/entities/company-service.entity.js';
import { MessagingModule } from '../messaging/messaging.module.js';
import { FormField } from './entities/form-field.entity.js';
import { FormFile } from './entities/form-file.entity.js';
import { FormRecipient } from './entities/form-recipient.entity.js';
import { FormSubmission } from './entities/form-submission.entity.js';
import { FormTemplate } from './entities/form-template.entity.js';
import { Form } from './entities/form.entity.js';
import { FormPublicController } from './form-public.controller.js';
import { FormController, FormWorkspaceController } from './form.controller.js';
import { FormEnabledGuard } from './form-enabled.guard.js';
import { FormAccessService } from './services/form-access.service.js';
import { FormAnalyticsService } from './services/form-analytics.service.js';
import { FormDistributionService } from './services/form-distribution.service.js';
import { FormPublicService } from './services/form-public.service.js';
import { FormService } from './services/form.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Form,
      FormField,
      FormRecipient,
      FormSubmission,
      FormFile,
      FormTemplate,
      CompanyService,
      Company,
    ]),
    AuthModule,
    AuditModule,
    MessagingModule,
  ],
  controllers: [FormPublicController, FormController, FormWorkspaceController],
  providers: [
    FormAccessService,
    FormService,
    FormPublicService,
    FormDistributionService,
    FormAnalyticsService,
    FormEnabledGuard,
  ],
})
export class FormModule {}
