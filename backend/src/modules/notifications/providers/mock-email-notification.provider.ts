import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  EmailNotificationPayload,
  EmailNotificationProvider,
  NotificationSendResult,
} from './notification-provider.types.js';

@Injectable()
export class MockEmailNotificationProvider implements EmailNotificationProvider {
  private readonly logger = new Logger(MockEmailNotificationProvider.name);

  async send(payload: EmailNotificationPayload): Promise<NotificationSendResult> {
    const messageId = `mock-email-${randomUUID()}`;
    this.logger.log(
      `Mock e-posta gönderildi → ${payload.to} (${payload.purpose}, konu="${payload.subject}", id=${messageId})`,
    );
    return { provider: 'MOCK_EMAIL', messageId, mock: true };
  }
}
