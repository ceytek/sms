import { apiRequest, apiUpload, apiBlob } from "@/lib/api";

export type SmsSourceType =
  | "CONTACT_GROUP"
  | "CONTACT_PICK"
  | "CONTACT_BOOK"
  | "MANUAL"
  | "FILE"
  | "CUSTOMER_CATEGORY"
  | "TAG";

export type SmsCampaignListItem = {
  id: string;
  status: string;
  body: string;
  name?: string;
  category?: string;
  composition?: string;
  originatorName?: string;
  validRecipientCount: number;
  acceptedCount: number;
  deliveredCount: number;
  failCount: number;
  queuedCount: number;
  processingCount: number;
  createdAt: string;
  scheduledAt?: string | null;
};

export type SmsCampaignReportSummary = {
  campaigns: number;
  recipients: number;
  delivered: number;
  failed: number;
  pending: number;
  campaignDelta: number;
  recipientDelta: number;
};

export type SmsCampaignProgress = {
  id: string;
  status: string;
  name?: string;
  category?: string;
  composition?: string;
  originatorName?: string;
  body: string;
  encoding: string;
  smsParts: number;
  personalized: boolean;
  rawRecipientCount: number;
  validRecipientCount: number;
  invalidCount: number;
  duplicateCount: number;
  excludedCount: number;
  blacklistCount: number;
  smsBlockedCount: number;
  consentExcludedCount: number;
  passiveCount: number;
  queuedCount: number;
  processingCount: number;
  acceptedCount: number;
  deliveredCount: number;
  failCount: number;
  estimatedUnits: number;
  actualUnits: number;
  reservedUnits: number;
  walletBalance: number;
  usedUnits?: number;
  createdAt?: string;
  sentAt?: string | null;
  audienceSource?: string;
  sendType?: string;
  originatorId?: string;
  preparedAt?: string | null;
  confirmedAt?: string | null;
  scheduledAt?: string | null;
  isMock: boolean;
  kvkkCheckEnabled: boolean;
  lastError?: string | null;
  blockedSamples?: { mobile?: string; reason?: string }[];
};

export type SmsTemplateRecord = {
  id: string;
  name: string;
  body: string;
  updatedAt?: string;
};

export const smsSendService = {
  originators() {
    return apiRequest<{ items: { id: string; name: string }[] }>("messaging/originators");
  },
  templates() {
    return apiRequest<{ items: SmsTemplateRecord[] }>("messaging/templates");
  },
  saveTemplate(name: string, body: string) {
    return apiRequest<SmsTemplateRecord>("messaging/templates", { method: "POST", body: { name, body } });
  },
  updateTemplate(id: string, name: string, body: string) {
    return apiRequest<SmsTemplateRecord>(`messaging/templates/${id}`, { method: "PATCH", body: { name, body } });
  },
  deleteTemplate(id: string) {
    return apiRequest<{ ok: boolean }>(`messaging/templates/${id}`, { method: "DELETE" });
  },
  list(query: { page?: number; limit?: number; search?: string; status?: string; from?: string; to?: string } = {}) {
    const qs = new URLSearchParams();
    qs.set("page", String(query.page || 1));
    qs.set("limit", String(query.limit || 10));
    if (query.search) qs.set("search", query.search);
    if (query.status && query.status !== "ALL") qs.set("status", query.status);
    if (query.from) qs.set("from", query.from);
    if (query.to) qs.set("to", query.to);
    return apiRequest<{
      items: SmsCampaignListItem[];
      summary: SmsCampaignReportSummary;
      meta: { page: number; total: number; totalPages: number; limit: number };
    }>(`messaging/campaigns?${qs}`);
  },
  create(data: Record<string, unknown>) {
    return apiRequest<{ id: string; status: string; wallet?: { balance: number; estimatedUnits: number; remaining: number; ok: boolean } }>(
      "messaging/campaigns",
      { method: "POST", body: data },
    );
  },
  checkRestricted(data: { originatorId: string; phones?: string[]; contactIds?: string[] }) {
    return apiRequest<{ blacklist: string[]; smsBlocked: string[]; total: number }>(
      "messaging/campaigns/check-restricted",
      { method: "POST", body: data },
    );
  },
  progress(id: string) {
    return apiRequest<SmsCampaignProgress>(`messaging/campaigns/${id}/progress`);
  },
  recipients(
    id: string,
    filter?: string | { status?: string; excludeReason?: string },
    page = 1,
    limit = 10,
  ) {
    const opts = typeof filter === "string" ? { status: filter } : filter ?? {};
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (typeof opts.status === "string" && opts.status && opts.status !== "[object Object]") {
      qs.set("status", opts.status);
    }
    if (typeof opts.excludeReason === "string" && opts.excludeReason) qs.set("excludeReason", opts.excludeReason);
    return apiRequest<{ items: { id: string; mobile?: string; name?: string; status: string; excludeReason?: string; lastError?: string; actedAt?: string | null }[]; meta: { total: number; totalPages: number; page: number } }>(
      `messaging/campaigns/${id}/recipients?${qs}`,
    );
  },
  confirm(id: string) {
    return apiRequest(`messaging/campaigns/${id}/confirm`, { method: "POST" });
  },
  cancel(id: string) {
    return apiRequest(`messaging/campaigns/${id}/cancel`, { method: "POST" });
  },
  retry(id: string) {
    return apiRequest(`messaging/campaigns/${id}/retry`, { method: "POST" });
  },
  uploadFile(id: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    return apiUpload(`messaging/campaigns/${id}/file`, form);
  },
  async exportCsv(id: string, status?: string) {
    const qs = status ? `?status=${status}` : "";
    const blob = await apiBlob(`messaging/campaigns/${id}/export${qs}`);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sms-${id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },
};
