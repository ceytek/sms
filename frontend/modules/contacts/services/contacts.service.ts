import { apiBlob, apiRequest, apiUpload } from "@/lib/api";
import type {
  ContactBulkAction,
  ContactDuplicatePolicy,
  ContactListResponse,
  ContactRecord,
  ContactSource,
  ContactStatus,
  ContactSummary,
} from "../types";

export const contactsService = {
  summary() {
    return apiRequest<ContactSummary>("contacts/summary");
  },

  list(params: Record<string, string | number | undefined>) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== "ALL") query.set(key, String(value));
    });
    const qs = query.toString();
    return apiRequest<ContactListResponse>(`contacts${qs ? `?${qs}` : ""}`);
  },

  create(data: {
    firstName?: string;
    lastName?: string;
    mobilePhone: string;
    email?: string;
    companyName?: string;
    notes?: string;
    status?: ContactStatus;
    groupIds?: string[];
    tagIds?: string[];
    customFields?: Record<string, string>;
  }) {
    return apiRequest<ContactRecord>("contacts", { method: "POST", body: data });
  },

  update(id: string, data: Record<string, unknown>) {
    return apiRequest<ContactRecord>(`contacts/${id}`, { method: "PATCH", body: data });
  },

  restrict(data: {
    mobilePhone: string;
    firstName?: string;
    lastName?: string;
    notes?: string;
    status: ContactStatus;
  }) {
    return apiRequest<ContactRecord>("contacts/restrict", { method: "POST", body: data });
  },

  remove(id: string) {
    return apiRequest<{ id: string }>(`contacts/${id}`, { method: "DELETE" });
  },
  smsHistory(id: string, page = 1) {
    return apiRequest<{
      contact: { id: string; name?: string | null; phone: string };
      items: ContactSmsHistoryItem[];
      meta: { page: number; limit: number; total: number; totalPages: number };
    }>(`contacts/${id}/sms-history?page=${page}`);
  },

  bulkAction(data: {
    action: ContactBulkAction;
    ids: string[];
    groupId?: string;
    tagId?: string;
  }) {
    return apiRequest<{ affected: number }>("contacts/bulk-action", { method: "POST", body: data });
  },

  async export(params: Record<string, string | undefined>) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    const blob = await apiBlob(`contacts/export?${query.toString()}`);
    const format = params.format === "csv" ? "csv" : "xlsx";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rehber.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  },
};

export type ContactSmsHistoryItem = {
  id: string;
  campaignId: string;
  sentAt?: string;
  originatorName?: string;
  status: string;
  excludeReason?: string;
  body?: string;
  smsParts: number;
};

export type ContactFilterState = {
  search?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyName?: string;
  groupId?: string;
  tagId?: string;
  source?: ContactSource | "ALL";
  status?: ContactStatus | "ALL";
};
