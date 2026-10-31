import { apiBlob, apiRequest } from "@/lib/api";
import type { PublicSurvey, SurveyQuestion, SurveyRecord, SurveySource } from "../types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const surveyService = {
  status() {
    return apiRequest<{ enabled: boolean }>("surveys/status");
  },
  dashboard() {
    return apiRequest<{
      total: number;
      active: number;
      sent: number;
      responses: number;
      responseRate: number;
      incomplete: number;
      recent: SurveyRecord[];
    }>("surveys/dashboard");
  },
  list() {
    return apiRequest<SurveyRecord[]>("surveys");
  },
  get(id: string) {
    return apiRequest<SurveyRecord & { questions: SurveyQuestion[] }>(`surveys/${id}`);
  },
  create(body: Record<string, unknown>) {
    return apiRequest<SurveyRecord & { questions: SurveyQuestion[] }>("surveys", { method: "POST", body });
  },
  update(id: string, body: Record<string, unknown>) {
    return apiRequest<SurveyRecord & { questions: SurveyQuestion[] }>(`surveys/${id}`, { method: "PATCH", body });
  },
  saveQuestions(id: string, questions: SurveyQuestion[]) {
    return apiRequest<SurveyRecord & { questions: SurveyQuestion[] }>(`surveys/${id}/questions`, {
      method: "PUT",
      body: { questions },
    });
  },
  publish(id: string, send = false) {
    return apiRequest<SurveyRecord>(`surveys/${id}/publish`, { method: "POST", body: { send } });
  },
  close(id: string) {
    return apiRequest<SurveyRecord>(`surveys/${id}/close`, { method: "POST", body: {} });
  },
  cancel(id: string) {
    return apiRequest<SurveyRecord>(`surveys/${id}/cancel`, { method: "POST", body: {} });
  },
  copy(id: string) {
    return apiRequest<SurveyRecord>(`surveys/${id}/copy`, { method: "POST", body: {} });
  },
  remove(id: string) {
    return apiRequest<{ id: string }>(`surveys/${id}`, { method: "DELETE" });
  },
  distribute(id: string, body: { originatorId: string; body: string; sources: SurveySource[] }) {
    return apiRequest<{ campaignId: string; validRecipientCount: number; skippedCount?: number }>(`surveys/${id}/distribute`, { method: "POST", body });
  },
  remind(id: string, body: { originatorId: string; body: string }) {
    return apiRequest<{ validRecipientCount: number }>(`surveys/${id}/remind`, { method: "POST", body: { ...body, sources: [] } });
  },
  results(id: string) {
    return apiRequest<SurveyResults>(`surveys/${id}/results`);
  },
  responses(params: Record<string, string | number | undefined>) {
    const qs = responseQuery(params);
    return apiRequest<{
      items: SurveyResponseRow[];
      total: number;
      page: number;
      limit: number;
      summary: ResponseSummary;
    }>(`surveys/responses${qs ? `?${qs}` : ""}`);
  },
  response(id: string) {
    return apiRequest<SurveyResponseDetail>(`surveys/responses/${id}`);
  },
  cancelResponse(id: string) {
    return apiRequest<{ id: string; status: string }>(`surveys/responses/${id}/cancel`, { method: "POST", body: {} });
  },
  downloadResponses(params: Record<string, string | number | undefined>, format: "csv" | "xlsx") {
    const qs = responseQuery({ ...params, format });
    return apiBlob(`surveys/responses/export?${qs}`);
  },
  templates() {
    return apiRequest<SurveyTemplateCard[]>("surveys/templates");
  },
  createTemplate(body: {
    name: string;
    description?: string;
    category: string;
    questions: { type: string; text: string; required: boolean; position: number; options?: { label: string; position: number }[] }[];
  }) {
    return apiRequest<SurveyTemplateCard>("surveys/templates", { method: "POST", body });
  },
  removeTemplate(id: string) {
    return apiRequest<{ id: string }>(`surveys/templates/${id}`, { method: "DELETE" });
  },
  fromTemplate(id: string) {
    return apiRequest<SurveyRecord>(`surveys/from-template/${id}`, { method: "POST", body: {} });
  },
  settings() {
    return apiRequest<{ defaultThankYou: string; defaultSmsBody: string }>("surveys/settings");
  },
  updateSettings(body: { defaultThankYou?: string; defaultSmsBody?: string }) {
    return apiRequest<{ defaultThankYou: string; defaultSmsBody: string }>("surveys/settings", { method: "PATCH", body });
  },
  download(id: string, format: "csv" | "xlsx") {
    return apiBlob(`surveys/${id}/export?format=${format}`);
  },
  qr(id: string, format: "svg" | "png") {
    return apiBlob(`surveys/${id}/qr?format=${format}`);
  },
};

export type SurveyResults = {
  survey: { id: string; name: string; status: string };
  funnel: { sent: number; delivered: number; opened: number; started: number; completed: number; responseRate: number };
  questions: (SurveyQuestion & {
    answers: number;
    scale: { label: string; count: number; percent: number }[];
    nps: { score: number; detractors: number; passives: number; promoters: number; total: number } | null;
    texts: { text: string; createdAt: string }[];
    options: { id: string; label: string; count: number; percent: number; position: number }[];
  })[];
  comments: { question_id: string; value_text: string; created_at: string }[];
};

export type SurveyResponseRow = {
  id: string;
  responseId?: string | null;
  surveyId: string;
  surveyName: string;
  anonymous: boolean;
  hasResponse?: boolean;
  status: string;
  channel: string;
  startedAt: string | null;
  completedAt: string | null;
  durationSeconds: number | null;
  name: string;
  phone: string;
};

export type SurveyResponseDetail = SurveyResponseRow & {
  answers: { question: string; type: string; value: string }[];
};

export type SurveyTemplateCard = {
  id: string;
  name: string;
  description: string;
  category: string;
  isSystem: boolean;
  questionCount: number;
  minutes: number;
  questions: { type: string; text: string; required: boolean; options: string[] }[];
};

export type ResponseSummary = {
  total: number;
  completed: number;
  partial: number;
  cancelled: number;
  completedRate: number;
  partialRate: number;
  cancelledRate: number;
};

function responseQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  return query.toString();
}

export async function loadPublicSurvey(path: string) {
  const response = await fetch(`${API_URL}/surveys/public/${path}`, { cache: "no-store" });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Anket açılamadı" }));
    throw new Error(error.message || "Anket açılamadı");
  }
  return response.json() as Promise<PublicSurvey>;
}

export async function postPublicSurvey(path: string, body: unknown) {
  const response = await fetch(`${API_URL}/surveys/public/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Yanıt kaydedilemedi" }));
    throw new Error(error.message || "Yanıt kaydedilemedi");
  }
  return response.json() as Promise<{ ok?: boolean; message?: string; responseId?: string }>;
}
