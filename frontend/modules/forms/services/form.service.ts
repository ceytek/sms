import { apiBlob, apiRequest } from "@/lib/api";
import type { FormField, FormRecord, FormSource, PublicForm, SubmissionDetail, SubmissionRecord, SubmissionSummary } from "../types";

export const formService = {
  status() {
    return apiRequest<{ enabled: boolean }>("form-status");
  },
  dashboard() {
    return apiRequest<{
      total: number;
      active: number;
      submissions: number;
      drafts: number;
      today: number;
      thisMonth: number;
      incomplete: number;
    }>("forms/dashboard");
  },
  list() {
    return apiRequest<FormRecord[]>("forms");
  },
  get(id: string) {
    return apiRequest<FormRecord & { fields: FormField[] }>(`forms/${id}`);
  },
  create(body: Record<string, unknown>) {
    return apiRequest<FormRecord & { fields: FormField[] }>("forms", { method: "POST", body });
  },
  update(id: string, body: Record<string, unknown>) {
    return apiRequest<FormRecord & { fields: FormField[] }>(`forms/${id}`, { method: "PATCH", body });
  },
  saveFields(id: string, fields: FormField[]) {
    return apiRequest<FormRecord & { fields: FormField[] }>(`forms/${id}/fields`, { method: "POST", body: { fields } });
  },
  publish(id: string) {
    return apiRequest<FormRecord>(`forms/${id}/publish`, { method: "POST", body: {} });
  },
  setStatus(id: string, status: string) {
    return apiRequest<FormRecord>(`forms/${id}/status`, { method: "PATCH", body: { status } });
  },
  copy(id: string) {
    return apiRequest<FormRecord>(`forms/${id}/copy`, { method: "POST", body: {} });
  },
  distribute(id: string, body: { originatorId: string; body: string; sources: FormSource[] }) {
    return apiRequest<{ campaignId: string; validRecipientCount: number }>(`forms/${id}/distribute`, { method: "POST", body });
  },
  qr(id: string) {
    return apiRequest<{ url: string }>(`forms/${id}/qr`);
  },
  templates() {
    return apiRequest<{ id: string; name: string; description: string; category: string; isSystem: boolean; fields: FormField[] }[]>("forms/templates");
  },
  createFromTemplate(templateId: string) {
    return apiRequest<FormRecord>(`forms/from-template/${templateId}`, { method: "POST", body: {} });
  },
  submissions(params?: Record<string, string>) {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiRequest<{
      items: SubmissionRecord[];
      total: number;
      page: number;
      limit: number;
      summary: SubmissionSummary;
      meta: { total: number; page: number; limit: number; totalPages: number };
    }>(`forms/submissions${qs}`);
  },
  getSubmission(id: string) {
    return apiRequest<SubmissionDetail>(`forms/submissions/${id}`);
  },
  updateSubmissionStatus(id: string, status: string) {
    return apiRequest<{ id: string; status: string }>(`forms/submissions/${id}/status`, { method: "PATCH", body: { status } });
  },
  exportSubmissions(params: Record<string, string>) {
    const qs = new URLSearchParams(params).toString();
    return apiBlob(`forms/submissions/export?${qs}`);
  },
  publicBySlug(slug: string) {
    return apiRequest<PublicForm>(`forms/public/f/${slug}`);
  },
  publicByToken(token: string) {
    return apiRequest<PublicForm & { alreadyCompleted?: boolean; allowEdit?: boolean }>(`forms/public/fr/${token}`);
  },
  publicSubmitSlug(slug: string, data: Record<string, unknown>) {
    return apiRequest<{ ok: boolean; submissionId?: string; message?: string }>(`forms/public/f/${slug}/submissions`, {
      method: "POST",
      body: { data },
    });
  },
  publicSubmitToken(token: string, data: Record<string, unknown>) {
    return apiRequest<{ ok: boolean; submissionId?: string; message?: string }>(`forms/public/fr/${token}/submissions`, {
      method: "POST",
      body: { data },
    });
  },
};
