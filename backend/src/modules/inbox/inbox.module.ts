import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Company } from '../companies/entities/company.entity.js';
import { CompanyService } from '../companies/entities/company-service.entity.js';
import { CompanyServiceTerm } from '../companies/entities/company-service-term.entity.js';
import { User } from '../auth/entities/user.entity.js';
import { InboxNotification } from './entities/inbox-notification.entity.js';
import { InboxService } from './inbox.service.js';
import { InboxController } from './inbox.controller.js';
import { INBOX_COMPOSERS } from './composers/inbox-composer.js';
import { OriginatorRequestedComposer } from './composers/originator-requested.composer.js';
import { OriginatorDecisionComposer } from './composers/originator-decision.composer.js';
import { ServiceTermExpiringComposer } from './composers/service-term-expiring.composer.js';
import { ServiceTermReminderJob } from './jobs/service-term-reminder.job.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InboxNotification,
      Company,
      CompanyService,
      CompanyServiceTerm,
      User,
    ]),
    AuthModule,
  ],
  controllers: [InboxController],
  providers: [
    InboxService,
    OriginatorRequestedComposer,
    OriginatorDecisionComposer,
    ServiceTermExpiringComposer,
    ServiceTermReminderJob,
    {
      provide: INBOX_COMPOSERS,
      useFactory: (
        requested: OriginatorRequestedComposer,
        decision: OriginatorDecisionComposer,
        expiring: ServiceTermExpiringComposer,
      ) => [requested, decision, expiring],
      inject: [
        OriginatorRequestedComposer,
        OriginatorDecisionComposer,
        ServiceTermExpiringComposer,
      ],
    },
  ],
  exports: [InboxService],
})
export class InboxModule {}
