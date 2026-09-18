import { apiRequest, apiUpload } from "@/lib/api";
import type {
  KvkkConsentDetail,
  KvkkConsentListItem,
  KvkkConsentMethod,
  KvkkConsentStatus,
  KvkkDashboard,
  KvkkFormRecord,
  KvkkQrRecord,
  KvkkSettings,
  KvkkStatus,
  KvkkTextDocument,
} from "../types";

export const kvkkService = {
  status() {
    return apiRequest<KvkkStatus>("kvkk/status");
  },
  dashboard(params: { from?: string; to?: string } = {}) {
    const query = new URLSearchParams();
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);
    const qs = query.toString();
    return apiRequest<KvkkDashboard>(`kvkk/dashboard${qs ? `?${qs}` : ""}`);
  },
  getSettings() {
    return apiRequest<KvkkSettings>("kvkk/settings");
  },
  updateSettings(data: Partial<Pick<KvkkSettings, "smsConsentCheckEnabled" | "companyDisplayName" | "contactInfo">>) {
    return apiRequest<KvkkSettings>("kvkk/settings", { method: "PATCH", body: data });
  },
  uploadLogo(file: File) {
    const form = new FormData();
    form.append("file", file);
    return apiUpload<KvkkSettings>("kvkk/settings/logo", form);
  },
  listTexts() {
    return apiRequest<KvkkTextDocument[]>("kvkk/texts");
  },
  getText(id: string) {
    return apiRequest<KvkkTextDocument>(`kvkk/texts/${id}`);
  },
  createText(data: { name: string; title: string; bodyHtml: string }) {
    return apiRequest<KvkkTextDocument>("kvkk/texts", { method: "POST", body: data });
  },
  updateText(id: string, data: { name: string }) {
    return apiRequest<KvkkTextDocument>(`kvkk/texts/${id}`, { method: "PATCH", body: data });
  },
  publishText(id: string, data: { title: string; bodyHtml: string }) {
    return apiRequest<KvkkTextDocument>(`kvkk/texts/${id}/versions`, { method: "POST", body: data });
  },
  listForms() {
    return apiRequest<KvkkFormRecord[]>("kvkk/forms");
  },
  getForm(id: string) {
    return apiRequest<KvkkFormRecord>(`kvkk/forms/${id}`);
  },
  createForm(data: Record<string, unknown>) {
    return apiRequest<KvkkFormRecord>("kvkk/forms", { method: "POST", body: data });
  },
  updateForm(id: string, data: Record<string, unknown>) {
    return apiRequest<KvkkFormRecord>(`kvkk/forms/${id}`, { method: "PATCH", body: data });
  },
  createFormLink(id: string, data: { mobilePhone: string; firstName?: string; lastName?: string }) {
    return apiRequest<{ id: string; consentId: string; publicUrl: string }>(`kvkk/forms/${id}/links`, {
      method: "POST",
      body: data,
    });
  },
  listQr() {
    return apiRequest<KvkkQrRecord[]>("kvkk/qr");
  },
  createQr(data: { name: string; formId: string; description?: string; isActive?: boolean; expiresAt?: string }) {
    return apiRequest<KvkkQrRecord>("kvkk/qr", { method: "POST", body: data });
  },
  updateQr(id: string, data: Record<string, unknown>) {
    return apiRequest<KvkkQrRecord>(`kvkk/qr/${id}`, { method: "PATCH", body: data });
  },
  listConsents(params: Record<string, string | number | undefined>) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== "ALL") query.set(key, String(value));
    });
    const qs = query.toString();
    return apiRequest<{ items: KvkkConsentListItem[]; total: number; page: number; limit: number }>(
      `kvkk/consents${qs ? `?${qs}` : ""}`,
    );
  },
  getConsent(id: string) {
    return apiRequest<KvkkConsentDetail>(`kvkk/consents/${id}`);
  },
  cancelConsent(id: string) {
    return apiRequest<KvkkConsentDetail>(`kvkk/consents/${id}/cancel`, { method: "POST" });
  },
  sendOtp(data: { mobilePhone: string; firstName?: string; lastName?: string }) {
    return apiRequest<{ challengeId: string; consentId: string; expiresAt: string; debugCode?: string }>(
      "kvkk/otp/send",
      { method: "POST", body: data },
    );
  },
  verifyOtp(data: { challengeId: string; code: string }) {
    return apiRequest<KvkkConsentDetail>("kvkk/otp/verify", { method: "POST", body: data });
  },
};

export function loadPublicForm(token: string) {
  return apiRequest<{
    source: "LINK" | "QR";
    prefill: { mobilePhone: string; firstName: string; lastName: string };
    form: KvkkFormRecord;
    text: { title: string; bodyHtml: string; version: number } | null;
  }>(`public/kvkk/${token}`);
}

export function submitPublicForm(
  token: string,
  data: { mobilePhone: string; firstName?: string; lastName?: string; email?: string; checkedIds: string[] },
) {
  return apiRequest<{ id: string; status: KvkkConsentStatus }>(`public/kvkk/${token}`, { method: "POST", body: data });
}

export type { KvkkConsentMethod, KvkkConsentStatus };
