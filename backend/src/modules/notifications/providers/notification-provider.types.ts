import { NotificationPurpose } from '../../../common/enums/notification-purpose.enum.js';

export const SMS_NOTIFICATION_PROVIDER = Symbol('SMS_NOTIFICATION_PROVIDER');
export const EMAIL_NOTIFICATION_PROVIDER = Symbol('EMAIL_NOTIFICATION_PROVIDER');

export type NotificationSendResult = {
  provider: string;
  messageId: string;
  mock: boolean;
};

export type SmsNotificationPayload = {
  to: string;
  body: string;
  purpose: NotificationPurpose;
  senderCompanyId: string;
  targetCompanyId: string;
};

export type EmailNotificationPayload = {
  to: string;
  subject: string;
  body: string;
  purpose: NotificationPurpose;
  senderCompanyId: string;
  targetCompanyId: string;
};

export interface SmsNotificationProvider {
  send(payload: SmsNotificationPayload): Promise<NotificationSendResult>;
}

export interface EmailNotificationProvider {
  send(payload: EmailNotificationPayload): Promise<NotificationSendResult>;
}
