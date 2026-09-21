import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { OriginatorsModule } from '../originators/originators.module.js';
import { Company } from '../companies/entities/company.entity.js';
import { User } from '../auth/entities/user.entity.js';
import { NotificationDispatch } from './entities/notification-dispatch.entity.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { MockSmsNotificationProvider } from './providers/mock-sms-notification.provider.js';
import { MockEmailNotificationProvider } from './providers/mock-email-notification.provider.js';
import {
  EMAIL_NOTIFICATION_PROVIDER,
  SMS_NOTIFICATION_PROVIDER,
} from './providers/notification-provider.types.js';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationDispatch, Company, User]), AuthModule, OriginatorsModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    { provide: SMS_NOTIFICATION_PROVIDER, useClass: MockSmsNotificationProvider },
    { provide: EMAIL_NOTIFICATION_PROVIDER, useClass: MockEmailNotificationProvider },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
