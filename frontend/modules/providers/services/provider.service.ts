import { apiRequest } from "@/lib/api";

export interface SmsProviderDetail {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  companyCount?: number;
  configSchema?: Record<string, unknown>;
  createdAt: string;
}

export interface ProviderCompany {
  id: string;
  companyId: string;
  companyCode?: string;
  companyName?: string;
  username?: string;
  createdAt: string;
}

export const providerService = {
  async list(): Promise<SmsProviderDetail[]> {
    try {
      return await apiRequest<SmsProviderDetail[]>("admin/providers");
    } catch {
      return apiRequest<SmsProviderDetail[]>("reference/sms-providers");
    }
  },

  async create(data: { code: string; name: string; isActive?: boolean }): Promise<SmsProviderDetail> {
    return apiRequest<SmsProviderDetail>("admin/providers", { method: "POST", body: data });
  },

  async update(id: string, data: { code?: string; name?: string; isActive?: boolean }): Promise<SmsProviderDetail> {
    return apiRequest<SmsProviderDetail>(`admin/providers/${id}`, { method: "PATCH", body: data });
  },

  async getProviderCompanies(providerId: string): Promise<ProviderCompany[]> {
    try {
      return await apiRequest<ProviderCompany[]>(`admin/providers/${providerId}/companies`);
    } catch {
      return [];
    }
  },
};
