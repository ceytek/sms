import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  NotificationSendResult,
  SmsNotificationPayload,
  SmsNotificationProvider,
} from './notification-provider.types.js';

@Injectable()
export class MockSmsNotificationProvider implements SmsNotificationProvider {
  private readonly logger = new Logger(MockSmsNotificationProvider.name);

  async send(payload: SmsNotificationPayload): Promise<NotificationSendResult> {
    const messageId = `mock-sms-${randomUUID()}`;
    this.logger.log(
      `Mock SMS gönderildi → ${payload.to} (${payload.purpose}, ${payload.body.length} karakter, id=${messageId})`,
    );
    return { provider: 'MOCK_SMS', messageId, mock: true };
  }
}
