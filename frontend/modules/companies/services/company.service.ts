import { apiRequest } from "@/lib/api";
import {
  CompanyDetail,
  CompanyListItem,
  CompanyListQuery,
  CompanyServiceAssignment,
  ContactType,
  CreateCompanyDto,
  CreateCompanyResponse,
  CustomerType,
  PaginatedResponse,
} from "../types";

export const companyService = {
  async list(query: CompanyListQuery = {}): Promise<PaginatedResponse<CompanyListItem>> {
    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.status) params.set("status", query.status);
    if (query.isDealer !== undefined) params.set("isDealer", String(query.isDealer));
    if (query.customerType) params.set("customerType", query.customerType);
    if (query.categoryId) params.set("categoryId", query.categoryId);
    if (query.subcategoryId) params.set("subcategoryId", query.subcategoryId);
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

  async update(
    id: string,
    data: {
      customerType?: CustomerType | null;
      categoryId?: string | null;
      subcategoryId?: string | null;
      priceListId?: string | null;
      cityId?: number | null;
      districtId?: number | null;
      address?: string;
      phone?: string;
      mobile?: string;
      email?: string;
    },
  ): Promise<CompanyDetail> {
    return apiRequest<CompanyDetail>(`admin/companies/${id}`, {
      method: "PATCH",
      body: data,
    });
  },

  async updateStatus(id: string, status: string): Promise<CompanyDetail> {
    return apiRequest<CompanyDetail>(`admin/companies/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
  },

  async updateSmsProvider(
    id: string,
    data: { providerId: string; creditRefundRate?: number | null },
  ): Promise<CompanyDetail> {
    return apiRequest<CompanyDetail>(`admin/companies/${id}/sms-provider`, {
      method: "PATCH",
      body: data,
    });
  },

  async listMyServices() {
    return apiRequest<{ items: CompanyServiceAssignment[] }>("company-services/mine");
  },

  async addService(id: string, serviceId: string): Promise<CompanyDetail> {
    return apiRequest<CompanyDetail>(`admin/companies/${id}/services`, {
      method: "POST",
      body: { serviceId },
    });
  },

  async setServiceActive(id: string, serviceId: string, isActive: boolean): Promise<CompanyDetail> {
    return apiRequest<CompanyDetail>(`admin/companies/${id}/services/${serviceId}`, {
      method: "PATCH",
      body: { isActive },
    });
  },

  async addContact(
    id: string,
    data: {
      name: string;
      contactType: ContactType;
      mobile?: string;
      phone?: string;
      email?: string;
    },
  ): Promise<CompanyDetail> {
    return apiRequest<CompanyDetail>(`admin/companies/${id}/contacts`, {
      method: "POST",
      body: data,
    });
  },

  async removeContact(id: string, contactId: string): Promise<CompanyDetail> {
    return apiRequest<CompanyDetail>(`admin/companies/${id}/contacts/${contactId}`, {
      method: "DELETE",
    });
  },
};
