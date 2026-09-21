export type InboxEventType =
  | "ORIGINATOR_REQUESTED"
  | "ORIGINATOR_APPROVED"
  | "ORIGINATOR_PASSIVATED"
  | "ORIGINATOR_BANNED"
  | string;

export interface InboxNotification {
  id: string;
  eventType: InboxEventType;
  title: string;
  body: string;
  href: string | null;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface InboxListResponse {
  items: InboxNotification[];
  total: number;
  page: number;
  limit: number;
}

export function inboxOriginatorId(item: InboxNotification): string | null {
  const id = item.payload?.originatorId;
  return typeof id === "string" && id.trim() ? id : null;
}
