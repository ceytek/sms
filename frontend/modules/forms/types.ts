export type FormStatus = "DRAFT" | "ACTIVE" | "PASSIVE" | "EXPIRED" | "ARCHIVED";
export type FormFieldType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "FIRST_NAME"
  | "LAST_NAME"
  | "PHONE"
  | "EMAIL"
  | "NUMBER"
  | "DATE"
  | "TIME"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "DROPDOWN"
  | "YES_NO"
  | "ADDRESS"
  | "CITY"
  | "DISTRICT"
  | "CHECKBOX"
  | "FILE_UPLOAD"
  | "HEADING";

export type SubmissionStatus = "NEW" | "IN_REVIEW" | "COMPLETED" | "APPROVED" | "REJECTED" | "ARCHIVED";

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  DRAFT: "Taslak",
  ACTIVE: "Aktif",
  PASSIVE: "Pasif",
  EXPIRED: "Süresi Doldu",
  ARCHIVED: "Arşiv",
};

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  NEW: "Yeni",
  IN_REVIEW: "İnceleniyor",
  COMPLETED: "Tamamlandı",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  ARCHIVED: "Arşiv",
};

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  SHORT_TEXT: "Kısa Metin",
  LONG_TEXT: "Uzun Metin",
  FIRST_NAME: "Ad",
  LAST_NAME: "Soyad",
  PHONE: "Telefon",
  EMAIL: "E-posta",
  NUMBER: "Sayı",
  DATE: "Tarih",
  TIME: "Saat",
  SINGLE_CHOICE: "Tek Seçim",
  MULTIPLE_CHOICE: "Çoklu Seçim",
  DROPDOWN: "Açılır Liste",
  YES_NO: "Evet / Hayır",
  ADDRESS: "Adres",
  CITY: "Şehir",
  DISTRICT: "İlçe",
  CHECKBOX: "Onay Kutusu",
  FILE_UPLOAD: "Dosya Yükleme",
  HEADING: "Başlık / Açıklama",
};

export type FormFieldOption = { label: string; position: number };
export type FormField = {
  id?: string;
  type: FormFieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  defaultValue?: string;
  position: number;
  validation?: Record<string, unknown> | null;
  options?: FormFieldOption[];
};

export type FormSource = {
  type: "CONTACT_GROUP" | "CONTACT_PICK" | "CONTACT_BOOK" | "MANUAL" | "FILE" | "TAG";
  label?: string;
  groupId?: string;
  tagId?: string;
  contactIds?: string[];
  phones?: string[];
};

export type FormRecord = {
  id: string;
  name: string;
  title: string;
  description: string;
  status: FormStatus;
  personalized: boolean;
  singleSubmission: boolean;
  allowEdit: boolean;
  startsAt: string | null;
  endsAt: string | null;
  maxSubmissions: number | null;
  publicSlug: string;
  smsBody: string;
  originatorId: string;
  audience: { sources?: FormSource[] } | null;
  logoUrl: string;
  companyNameOverride: string;
  thankYouMessage: string;
  companyName?: string;
  submissions: number;
  lastSubmission: string | null;
  createdAt: string;
  publishedAt: string | null;
  fields?: FormField[];
};

export type PublicForm = {
  id: string;
  title: string;
  description: string;
  companyName: string;
  logoUrl: string;
  thankYouMessage: string;
  alreadyCompleted?: boolean;
  allowEdit?: boolean;
  recipientId: string | null;
  fields: {
    id: string;
    type: FormFieldType;
    label: string;
    description: string;
    placeholder: string;
    required: boolean;
    defaultValue: string;
    validation: Record<string, unknown> | null;
    options: FormFieldOption[];
  }[];
};

export type SubmissionRecord = {
  id: string;
  formId: string;
  formName: string;
  channel: string;
  status: SubmissionStatus;
  source: string | null;
  data: Record<string, unknown>;
  name?: string;
  phone?: string;
  ipAddress: string | null;
  startedAt?: string | null;
  createdAt: string;
  completedAt: string | null;
  durationSeconds?: number | null;
};

export type SubmissionSummary = {
  total: number;
  fresh: number;
  inReview: number;
  approved: number;
  freshRate: number;
  inReviewRate: number;
  approvedRate: number;
};

export type SubmissionDetail = SubmissionRecord & {
  fields: { id: string; type: string; label: string; position: number; options: FormFieldOption[] }[];
  files: { id: string; fieldId: string; fileName: string; fileSize: number; mimeType: string }[];
};
