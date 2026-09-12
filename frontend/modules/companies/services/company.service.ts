import { apiRequest } from "@/lib/api";
import {
  CompanyDetail,
  CompanyListItem,
  CompanyListQuery,
  CreateCompanyDto,
  CreateCompanyResponse,
  PaginatedResponse,
} from "../types";

export const companyService = {
  async list(query: CompanyListQuery = {}): Promise<PaginatedResponse<CompanyListItem>> {
    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.status) params.set("status", query.status);
    if (query.isDealer !== undefined) params.set("isDealer", String(query.isDealer));
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));

    const qs = params.toString();
    return apiRequest<PaginatedResponse<CompanyListItem>>(
      `admin/companies${qs ? `?${qs}` : ""}`
    );
  },

  async getById(id: string): Promise<CompanyDetail> {
    return apiRequest<CompanyDetail>(`admin/companies/${id}`);
  },

  async create(data: CreateCompanyDto): Promise<CreateCompanyResponse> {
    return apiRequest<CreateCompanyResponse>("admin/companies", {
      method: "POST",
      body: data,
    });
  },

  async updateStatus(id: string, status: string): Promise<CompanyDetail> {
    return apiRequest<CompanyDetail>(`admin/companies/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
};
