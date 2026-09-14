export type OriginatorStatus = "PENDING" | "ACTIVE" | "REJECTED" | "PASSIVE";

export interface OriginatorRecord {
  id: string;
  name: string;
  status: OriginatorStatus;
  companyId: string;
  companyName?: string;
  companyCode?: string;
  isDealer: boolean;
  dealerCompanyName?: string;
  createdAt: string;
}

export interface OriginatorCompanyCounts {
  total: number;
  pending: number;
  active: number;
  passive: number;
}

export interface OriginatorCompany {
  id: string;
  name: string;
  companyCode: string;
  isDealer: boolean;
  dealerCompanyName?: string;
  counts: OriginatorCompanyCounts;
  customerPending?: number;
}

export interface BannedOriginator {
  id: string;
  name: string;
  reason?: string;
  createdAt: string;
}

export interface OriginatorListQuery {
  search?: string;
  status?: OriginatorStatus;
  companyId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedOriginators {
  items: OriginatorRecord[];
  total: number;
  page: number;
  limit: number;
}

export const ORIGINATOR_STATUS_LABELS: Record<OriginatorStatus, string> = {
  PENDING: "Onay bekliyor",
  ACTIVE: "Aktif",
  REJECTED: "Reddedildi",
  PASSIVE: "Pasif",
};
