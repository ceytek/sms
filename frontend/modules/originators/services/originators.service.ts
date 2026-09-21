import { apiRequest } from "@/lib/api";
import type {
  BannedOriginator,
  OriginatorCompany,
  OriginatorListQuery,
  OriginatorRecord,
  PaginatedOriginators,
} from "../types";

export const originatorsService = {
  listCompanies(query: { search?: string; isDealer?: boolean } = {}) {
    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.isDealer !== undefined) params.set("isDealer", String(query.isDealer));
    const qs = params.toString();
    return apiRequest<{ items: OriginatorCompany[] }>(
      `admin/originators/companies${qs ? `?${qs}` : ""}`,
    );
  },

  listPending(dealerId?: string) {
    const qs = dealerId ? `?dealerId=${encodeURIComponent(dealerId)}` : "";
    return apiRequest<{ items: OriginatorRecord[] }>(`admin/originators/pending${qs}`);
  },

  listMine() {
    return apiRequest<{ items: OriginatorRecord[] }>("admin/originators/mine");
  },

  createMine(data: { name: string }) {
    return apiRequest<OriginatorRecord>("admin/originators/mine", {
      method: "POST",
      body: data,
    });
  },

  list(query: OriginatorListQuery = {}) {
    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.status) params.set("status", query.status);
    if (query.companyId) params.set("companyId", query.companyId);
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return apiRequest<PaginatedOriginators>(`admin/originators${qs ? `?${qs}` : ""}`);
  },

  create(data: { companyId: string; name: string }) {
    return apiRequest<OriginatorRecord>("admin/originators", {
      method: "POST",
      body: data,
    });
  },

  updateStatus(id: string, status: "ACTIVE" | "PASSIVE") {
    return apiRequest<OriginatorRecord>(`admin/originators/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
  },

  banExisting(id: string) {
    return apiRequest<BannedOriginator>(`admin/originators/${id}/ban`, {
      method: "POST",
    });
  },

  listBanned() {
    return apiRequest<{ items: BannedOriginator[] }>("admin/originators/banned");
  },

  addBanned(data: { name: string; reason?: string }) {
    return apiRequest<BannedOriginator>("admin/originators/banned", {
      method: "POST",
      body: data,
    });
  },

  removeBanned(id: string) {
    return apiRequest<{ success: boolean }>(`admin/originators/banned/${id}`, {
      method: "DELETE",
    });
  },
};
