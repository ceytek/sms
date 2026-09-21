import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Company } from '../companies/entities/company.entity.js';
import { User } from '../auth/entities/user.entity.js';
import { InboxNotification } from './entities/inbox-notification.entity.js';
import { InboxService } from './inbox.service.js';
import { InboxController } from './inbox.controller.js';
import { INBOX_COMPOSERS } from './composers/inbox-composer.js';
import { OriginatorRequestedComposer } from './composers/originator-requested.composer.js';
import { OriginatorDecisionComposer } from './composers/originator-decision.composer.js';

@Module({
  imports: [TypeOrmModule.forFeature([InboxNotification, Company, User]), AuthModule],
  controllers: [InboxController],
  providers: [
    InboxService,
    OriginatorRequestedComposer,
    OriginatorDecisionComposer,
    {
      provide: INBOX_COMPOSERS,
      useFactory: (
        requested: OriginatorRequestedComposer,
        decision: OriginatorDecisionComposer,
      ) => [requested, decision],
      inject: [OriginatorRequestedComposer, OriginatorDecisionComposer],
    },
  ],
  exports: [InboxService],
})
export class InboxModule {}
