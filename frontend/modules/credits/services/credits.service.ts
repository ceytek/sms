import { apiRequest } from "@/lib/api";
import type {
  CreditCustomer,
  CreditLoadResult,
  HistoryPeriod,
  PaginatedCreditHistory,
  WalletType,
} from "../types";

export const creditsService = {
  listCustomers(search?: string) {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiRequest<{ items: CreditCustomer[] }>(`admin/credits/customers${qs}`);
  },

  getCustomer(id: string) {
    return apiRequest<CreditCustomer>(`admin/credits/customers/${id}`);
  },

  history(companyId: string, walletType: WalletType, period?: HistoryPeriod) {
    const params = new URLSearchParams({ walletType });
    if (period) params.set("period", period);
    return apiRequest<PaginatedCreditHistory>(
      `admin/credits/customers/${companyId}/history?${params.toString()}`,
    );
  },

  load(data: { companyId: string; walletType: WalletType; amount: number; unitPrice?: number }) {
    return apiRequest<CreditLoadResult>("admin/credits", {
      method: "POST",
      body: data,
    });
  },
};
