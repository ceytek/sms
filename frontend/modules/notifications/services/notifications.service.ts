import { apiRequest } from "@/lib/api";
import type { AccountCredentialsDispatchResult, CredentialsNotifyStatus, NotificationChannel } from "../types";

export const notificationsService = {
  credentialsStatus() {
    return apiRequest<CredentialsNotifyStatus>("admin/notifications/account-credentials/status");
  },

  sendAccountCredentials(data: {
    companyId: string;
    channel: NotificationChannel;
    password: string;
  }) {
    return apiRequest<AccountCredentialsDispatchResult>("admin/notifications/account-credentials", {
      method: "POST",
      body: data,
    });
  },
};
