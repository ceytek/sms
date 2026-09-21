import { apiRequest } from "@/lib/api";
import type { InboxListResponse, InboxNotification } from "../types";

export const inboxService = {
  list(limit = 20) {
    return apiRequest<InboxListResponse>(`inbox?limit=${limit}`);
  },

  unreadCount() {
    return apiRequest<{ count: number }>("inbox/unread-count");
  },

  markRead(id: string) {
    return apiRequest<InboxNotification>(`inbox/${id}/read`, { method: "PATCH" });
  },

  markAllRead() {
    return apiRequest<{ success: boolean }>("inbox/read-all", { method: "POST" });
  },

  remove(id: string) {
    return apiRequest<{ id: string; unreadRemoved: boolean }>(`inbox/${id}`, {
      method: "DELETE",
    });
  },
};
