export type SurveyStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "COMPLETED" | "EXPIRED" | "CANCELLED";
export type SurveyQuestionType =
  | "SINGLE"
  | "MULTI"
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "YES_NO"
  | "RATING"
  | "STARS"
  | "NPS"
  | "DROPDOWN"
  | "DATE";

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  DRAFT: "Taslak",
  SCHEDULED: "Planlandı",
  ACTIVE: "Aktif",
  COMPLETED: "Tamamlandı",
  EXPIRED: "Süresi Doldu",
  CANCELLED: "İptal Edildi",
};

export const QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  SINGLE: "Tek seçim",
  MULTI: "Çoklu seçim",
  SHORT_TEXT: "Kısa metin",
  LONG_TEXT: "Uzun metin",
  YES_NO: "Evet / Hayır",
  RATING: "1–5 puan",
  STARS: "Yıldız",
  NPS: "NPS (0–10)",
  DROPDOWN: "Açılır liste",
  DATE: "Tarih",
};

export type SurveyOption = { id?: string; label: string; position: number };
export type SurveyQuestion = {
  id?: string;
  type: SurveyQuestionType;
  text: string;
  description?: string;
  required: boolean;
  position: number;
  showWhen?: { questionId: string; optionId?: string; value?: string } | null;
  options: SurveyOption[];
};

export type SurveySource = {
  type: "CONTACT_GROUP" | "CONTACT_PICK" | "CONTACT_BOOK" | "MANUAL" | "FILE" | "TAG";
  label?: string;
  groupId?: string;
  tagId?: string;
  contactIds?: string[];
  phones?: string[];
};

export type SurveyRecord = {
  id: string;
  name: string;
  formTitle: string;
  description: string;
  status: SurveyStatus;
  anonymous: boolean;
  personalized: boolean;
  singleResponse: boolean;
  allowEdit: boolean;
  startsAt: string | null;
  endsAt: string | null;
  publicSlug: string;
  smsBody: string;
  originatorId: string;
  audience: { sources?: SurveySource[] } | null;
  logoUrl: string;
  companyNameOverride: string;
  thankYouMessage: string;
  companyName?: string;
  sent: number;
  completed: number;
  responseRate: number;
  questions?: SurveyQuestion[];
};

export type PublicSurvey = {
  id: string;
  title: string;
  description: string;
  anonymous: boolean;
  companyName: string;
  logoUrl: string;
  thankYouMessage: string;
  alreadyCompleted?: boolean;
  questions: {
    id: string;
    type: SurveyQuestionType;
    text: string;
    description: string;
    required: boolean;
    showWhen: { questionId: string; optionId?: string; value?: string } | null;
    options: { id: string; label: string }[];
  }[];
};
