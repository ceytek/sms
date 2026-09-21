export type NotificationChannel = "SMS" | "EMAIL";

export interface AccountCredentialsDispatchResult {
  channel: NotificationChannel;
  status: "MOCK_SENT" | "FAILED";
  recipient: string;
  mock: boolean;
  message: string;
}

export interface CredentialsNotifyStatus {
  canSendSms: boolean;
  smsDisabledReason: string | null;
}
