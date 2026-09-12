export type PriceListType = "PLATFORM" | "DEALER" | "CUSTOMER";
export type ProductType = "SMS" | "AI";

export interface PriceListItem {
  id: string;
  priceListId: string;
  productId: string;
  productCode?: string;
  productName?: string;
  unitPrice: number;
}

export interface PriceList {
  id: string;
  name: string;
  listType: PriceListType;
  ownerCompanyId?: string;
  currency: string;
  validFrom?: string;
  validTo?: string;
  isActive: boolean;
  items?: PriceListItem[];
  assignmentCount?: number;
}

export interface PriceListAssignment {
  id: string;
  companyId: string;
  companyCode?: string;
  companyName?: string;
  assignedAt: string;
}

export interface CreatePriceListDto {
  name: string;
  listType: PriceListType;
  currency?: string;
  validFrom?: string;
  validTo?: string;
  isActive?: boolean;
}

export interface UpdatePriceListItemDto {
  productId: string;
  unitPrice: number;
}

export interface AssignPriceListDto {
  companyId: string;
  priceListId: string;
}

export interface CompanyPriceListAssignment {
  id: string;
  companyId: string;
  companyName?: string;
  priceListId: string;
  priceListName?: string;
  assignedAt: string;
}

export const PRICE_LIST_TYPE_LABELS: Record<PriceListType, string> = {
  PLATFORM: "Platform",
  DEALER: "Bayi",
  CUSTOMER: "Müşteri",
};
