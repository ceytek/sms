import { apiRequest, apiUpload } from "@/lib/api";
import type {
  CompanySourceItem,
  ContactDuplicatePolicy,
  ImportJobRecord,
  ImportPreviewFile,
} from "../types";

export const contactImportsService = {
  previewFile(file: File) {
    const form = new FormData();
    form.append("file", file);
    return apiUpload<ImportPreviewFile>("contact-imports/preview", form);
  },
  analyze(data: {
    jobId: string;
    mapping: Record<string, string> & { customFields?: Record<string, string> };
  }) {
    return apiRequest<ImportJobRecord>("contact-imports/analyze", { method: "POST", body: data });
  },
  commit(data: {
    jobId: string;
    mapping?: Record<string, string> & { customFields?: Record<string, string> };
    duplicatePolicy?: ContactDuplicatePolicy;
    groupIds?: string[];
    tagIds?: string[];
    autoGroupName?: string;
  }) {
    return apiRequest<ImportJobRecord>("contact-imports/commit", { method: "POST", body: data });
  },
  bulkPreview(data: { numbers: string; duplicatePolicy?: ContactDuplicatePolicy }) {
    return apiRequest<ImportJobRecord>("contact-imports/bulk-preview", { method: "POST", body: data });
  },
  listJobs() {
    return apiRequest<ImportJobRecord[]>("contact-imports");
  },
  getJob(id: string) {
    return apiRequest<ImportJobRecord>(`contact-imports/${id}`);
  },
  companySources(params: Record<string, string | undefined>) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    const qs = query.toString();
    return apiRequest<{ items: CompanySourceItem[]; total: number }>(
      `contact-imports/company-sources${qs ? `?${qs}` : ""}`,
    );
  },
  previewCompanies(data: {
    companyIds?: string[];
    categoryId?: string;
    subcategoryId?: string;
    search?: string;
    duplicatePolicy?: ContactDuplicatePolicy;
  }) {
    return apiRequest<ImportJobRecord>("contact-imports/from-companies/preview", {
      method: "POST",
      body: data,
    });
  },
};
