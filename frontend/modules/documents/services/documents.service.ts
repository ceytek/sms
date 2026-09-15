import { apiBlob, apiRequest, apiUpload } from "@/lib/api";
import type {
  CompanyDocumentsPayload,
  DocumentTypeRecord,
} from "../types";

export const documentsService = {
  listTypes() {
    return apiRequest<DocumentTypeRecord[]>("admin/document-types");
  },

  createType(data: {
    name: string;
    description?: string;
    isRequired: boolean;
    isActive: boolean;
    appliesToAll: boolean;
    sortOrder: number;
    assignments: { categoryId: string; isRequired: boolean }[];
  }) {
    return apiRequest<DocumentTypeRecord>("admin/document-types", {
      method: "POST",
      body: data,
    });
  },

  updateType(
    id: string,
    data: {
      name?: string;
      description?: string;
      isRequired?: boolean;
      isActive?: boolean;
      appliesToAll?: boolean;
      sortOrder?: number;
      assignments?: { categoryId: string; isRequired: boolean }[];
    },
  ) {
    return apiRequest<DocumentTypeRecord>(`admin/document-types/${id}`, {
      method: "PATCH",
      body: data,
    });
  },

  getCompanyDocuments(companyId: string) {
    return apiRequest<CompanyDocumentsPayload>(`admin/companies/${companyId}/documents`);
  },

  addCustom(companyId: string, name: string) {
    return apiRequest<unknown>(`admin/companies/${companyId}/documents/custom`, {
      method: "POST",
      body: { name },
    });
  },

  updateItem(
    companyId: string,
    data: {
      id?: string;
      documentTypeId?: string;
      status?: string;
      missingDescription?: string;
    },
  ) {
    return apiRequest<CompanyDocumentsPayload>(`admin/companies/${companyId}/documents`, {
      method: "PATCH",
      body: data,
    });
  },

  upload(companyId: string, file: File, params: { documentId?: string; documentTypeId?: string }) {
    const form = new FormData();
    form.append("file", file);
    const query = new URLSearchParams();
    if (params.documentId) query.set("documentId", params.documentId);
    if (params.documentTypeId) query.set("documentTypeId", params.documentTypeId);
    const qs = query.toString();
    return apiUpload<CompanyDocumentsPayload>(
      `admin/companies/${companyId}/documents/file${qs ? `?${qs}` : ""}`,
      form,
    );
  },

  async viewFile(companyId: string, documentId: string) {
    const blob = await apiBlob(`admin/companies/${companyId}/documents/${documentId}/file`);
    return URL.createObjectURL(blob);
  },

  deleteFile(companyId: string, documentId: string) {
    return apiRequest<CompanyDocumentsPayload>(
      `admin/companies/${companyId}/documents/${documentId}/file`,
      { method: "DELETE" },
    );
  },

  deleteCustom(companyId: string, documentId: string) {
    return apiRequest<CompanyDocumentsPayload>(
      `admin/companies/${companyId}/documents/${documentId}`,
      { method: "DELETE" },
    );
  },

  complete(companyId: string) {
    return apiRequest<CompanyDocumentsPayload>(`admin/companies/${companyId}/documents/complete`, {
      method: "POST",
    });
  },
};
