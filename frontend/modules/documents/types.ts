export type DocumentStatus = "pending" | "available" | "missing";
export type DocumentProcessStatus = "in_progress" | "completed";

export interface DocumentTypeAssignment {
  id: string;
  categoryId: string;
  categoryName: string;
  isRequired: boolean;
}

export interface DocumentTypeRecord {
  id: string;
  name: string;
  description?: string | null;
  isRequired: boolean;
  isActive: boolean;
  appliesToAll: boolean;
  sortOrder: number;
  assignments: DocumentTypeAssignment[];
}

export interface CompanyDocumentItem {
  id: string | null;
  documentTypeId: string | null;
  name: string;
  description?: string | null;
  isStandard: boolean;
  isRequired: boolean;
  status: DocumentStatus;
  fileName?: string | null;
  missingDescription?: string | null;
  uploadedAt?: string | null;
}

export interface CompanyDocumentsPayload {
  companyId: string;
  companyName: string;
  categoryName?: string | null;
  subcategoryName?: string | null;
  process: {
    status: DocumentProcessStatus;
    completedAt?: string | null;
    completedBy?: string | null;
  };
  summary: {
    totalCount: number;
    availableCount: number;
    requiredBlockingCount: number;
  };
  standard: CompanyDocumentItem[];
  custom: CompanyDocumentItem[];
}

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: "Bekliyor",
  available: "Mevcut",
  missing: "Eksik",
};

export const DOCUMENT_PROCESS_LABELS: Record<DocumentProcessStatus, string> = {
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
};
