export type ContactStatus = "ACTIVE" | "PASSIVE" | "BLACKLIST" | "SMS_BLOCKED";
export type ContactSource =
  | "MANUAL"
  | "EXCEL"
  | "CSV"
  | "BULK_NUMBERS"
  | "COMPANY_IMPORT"
  | "API";
export type ContactImportType = "EXCEL" | "CSV" | "BULK_NUMBERS" | "COMPANY";
export type ContactImportStatus = "PREVIEW" | "COMPLETED" | "FAILED" | "CANCELLED";
export type ContactDuplicatePolicy = "SKIP" | "UPDATE" | "ADD_TO_GROUP";
export type ContactBulkAction =
  | "ADD_TO_GROUP"
  | "REMOVE_FROM_GROUP"
  | "ADD_TAG"
  | "REMOVE_TAG"
  | "ACTIVATE"
  | "DEACTIVATE"
  | "BLACKLIST"
  | "SMS_BLOCK"
  | "DELETE";
export type ContactCustomFieldType = "TEXT" | "DATE" | "NUMBER";
export const MAX_CONTACT_CUSTOM_FIELDS = 7;

export interface ContactNamedRef {
  id: string;
  name: string;
}

export interface ContactRecord {
  id: string;
  firstName: string;
  lastName: string;
  mobilePhone: string;
  normalizedPhone: string;
  formattedPhone: string;
  email: string;
  companyName: string;
  sourceCompanyId?: string | null;
  source: ContactSource;
  status: ContactStatus;
  notes: string;
  customFields?: Record<string, string>;
  groups: ContactNamedRef[];
  tags: ContactNamedRef[];
  createdAt: string;
}

export interface ContactListResponse {
  items: ContactRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface ContactSummary {
  total: number;
  active: number;
  blocked: number;
  blacklist?: number;
  smsBlocked?: number;
  groupCount: number;
  canImportFromCompanies: boolean;
}

export interface ContactGroupRecord {
  id: string;
  name: string;
  description: string;
  parentId?: string | null;
  isActive: boolean;
  memberCount: number;
}

export interface ContactTagRecord {
  id: string;
  name: string;
  isActive: boolean;
  memberCount: number;
}

export interface ContactCustomFieldRecord {
  id: string;
  name: string;
  fieldType: ContactCustomFieldType;
  sortOrder: number;
  isActive: boolean;
}

export interface ImportErrorRow {
  rowNumber: number | null;
  errorType?: string;
  errorMessage?: string;
  rawData?: Record<string, string> | null;
}

export interface ImportJobRecord {
  id: string;
  fileName: string;
  importType: ContactImportType;
  status: ContactImportStatus;
  totalRows: number;
  validRows: number;
  successfulRows: number;
  failedRows: number;
  duplicateRows: number;
  existingRows: number;
  createdAt: string;
  completedAt?: string | null;
  columns?: string[];
  mapping?: Record<string, string> | null;
  errors?: ImportErrorRow[];
}

export interface ImportPreviewFile {
  jobId: string;
  fileName: string;
  importType: ContactImportType;
  columns: string[];
  totalRows: number;
  sampleRows: Record<string, string>[];
}

export interface CompanySourceItem {
  id: string;
  name: string;
  mobile: string;
  categoryName: string;
  subcategoryName: string;
}

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  ACTIVE: "Aktif",
  PASSIVE: "Pasif",
  BLACKLIST: "Yasaklı",
  SMS_BLOCKED: "SMS Gönderilmeyecek",
};

export const CUSTOM_FIELD_TYPE_LABELS: Record<ContactCustomFieldType, string> = {
  TEXT: "Metin",
  DATE: "Tarih",
  NUMBER: "Sayı",
};

export const CONTACT_SOURCE_LABELS: Record<ContactSource, string> = {
  MANUAL: "Manuel",
  EXCEL: "Excel",
  CSV: "CSV",
  BULK_NUMBERS: "Toplu Numara",
  COMPANY_IMPORT: "Firma Aktarımı",
  API: "API",
};

export const IMPORT_TYPE_LABELS: Record<ContactImportType, string> = {
  EXCEL: "Excel",
  CSV: "CSV",
  BULK_NUMBERS: "Toplu Numara",
  COMPANY: "Firma Aktarımı",
};

export const IMPORT_STATUS_LABELS: Record<ContactImportStatus, string> = {
  PREVIEW: "Önizleme",
  COMPLETED: "Tamamlandı",
  FAILED: "Başarısız",
  CANCELLED: "İptal",
};

export const DUPLICATE_POLICY_LABELS: Record<ContactDuplicatePolicy, string> = {
  SKIP: "Mevcut kaydı atla",
  UPDATE: "Mevcut kaydı güncelle",
  ADD_TO_GROUP: "Sadece gruba ekle",
};

export const ERROR_TYPE_LABELS: Record<string, string> = {
  MISSING_PHONE: "Telefon eksik",
  INVALID_PHONE: "Telefon formatı geçersiz",
  DUPLICATE: "Mükerrer",
  EXISTS: "Mevcut rehberde bulunan",
  MISSING_REQUIRED: "Zorunlu alan eksik",
  OTHER: "Diğer",
};

export const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";
