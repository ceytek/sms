export type KvkkConsentStatus = "APPROVED" | "PENDING" | "REJECTED" | "CANCELLED";
export type KvkkConsentMethod = "SHORT_CODE" | "SMS_FORM" | "QR";

export const KVKK_STATUS_LABELS: Record<KvkkConsentStatus, string> = {
  APPROVED: "Onaylı",
  PENDING: "Bekliyor",
  REJECTED: "Reddedildi",
  CANCELLED: "İptal Edildi",
};

export const KVKK_METHOD_LABELS: Record<KvkkConsentMethod, string> = {
  SHORT_CODE: "Kısa Kod",
  SMS_FORM: "SMS Form",
  QR: "QR Kod",
};

export interface KvkkStatus {
  enabled: boolean;
  smsConsentCheckEnabled?: boolean;
}

export interface KvkkDashboard {
  total: number;
  approved: number;
  pending: number;
  cancelled: number;
  rejected: number;
  shortCode: number;
  smsForm: number;
  qr: number;
}

export interface KvkkSettings {
  smsConsentCheckEnabled: boolean;
  companyDisplayName: string;
  logoUrl: string;
  contactInfo: string;
  updatedAt?: string | null;
}

export function kvkkMediaUrl(path: string, updatedAt?: string | null) {
  if (!path) return "";
  const withHost = /^https?:\/\//i.test(path)
    ? path
    : `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  if (!updatedAt) return withHost;
  const glue = withHost.includes("?") ? "&" : "?";
  return `${withHost}${glue}t=${encodeURIComponent(updatedAt)}`;
}

export interface KvkkTextVersion {
  id: string;
  version: number;
  title: string;
  bodyHtml: string;
  isCurrent: boolean;
  createdAt: string;
}

export interface KvkkTextDocument {
  id: string;
  name: string;
  isActive: boolean;
  currentVersion: KvkkTextVersion | null;
  versions: KvkkTextVersion[];
  createdAt: string;
}

export interface KvkkCheckbox {
  id: string;
  label: string;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface KvkkFormRecord {
  id: string;
  name: string;
  description: string;
  title: string;
  subtitle: string;
  logoUrl: string;
  companyDisplayName: string;
  contactInfo: string;
  textDocumentId: string | null;
  fields: string[];
  isActive: boolean;
  checkboxes: KvkkCheckbox[];
  createdAt: string;
}

export interface KvkkQrRecord {
  id: string;
  name: string;
  description: string;
  formId: string;
  formName?: string;
  token: string;
  publicUrl: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export interface KvkkConsentListItem {
  id: string;
  firstName: string;
  lastName: string;
  mobilePhone: string;
  formattedPhone: string;
  email: string;
  status: KvkkConsentStatus;
  method: KvkkConsentMethod;
  formName: string;
  textVersionNumber: number | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface KvkkConsentDetail extends KvkkConsentListItem {
  formId: string | null;
  textVersionId: string | null;
  textTitle: string;
  textBody: string;
  checkboxAnswers: { id: string; label: string; required: boolean; checked: boolean }[];
  formPayload: Record<string, string>;
  qrId: string | null;
  qrName: string | null;
  otpChallengeId: string | null;
  formLinkId: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelSource: string | null;
}

export const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
