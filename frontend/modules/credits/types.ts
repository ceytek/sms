export type WalletType = "SMS" | "AI";
export type HistoryPeriod = "DAY" | "WEEK" | "MONTH" | "YEAR";
export type CompanyStatus = "ACTIVE" | "PASSIVE" | "SUSPENDED";
export type CreditTransactionType = "CREDIT" | "REFUND";

export interface CreditPriceList {
  id: string;
  name: string;
}

export interface CreditCustomer {
  id: string;
  name: string;
  companyCode: string;
  status: CompanyStatus;
  smsBalance: number;
  aiBalance: number;
  hasAiService: boolean;
  priceList: CreditPriceList | null;
}

export interface CreditLoadResult {
  id: string;
  companyId: string;
  walletType: WalletType;
  transactionType?: CreditTransactionType;
  amount: number;
  unitPrice: number | null;
  balanceAfter: number;
  priceListName: string | null;
  createdAt: string;
}

export interface CreditHistoryItem {
  id: string;
  walletType: WalletType;
  transactionType?: CreditTransactionType;
  amount: number;
  unitPrice: number | null;
  balanceBefore: number;
  balanceAfter: number;
  priceListName: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface CreditHistorySummary {
  loaded: number;
  refunded: number;
  net: number;
  count: number;
}

export interface PaginatedCreditHistory {
  items: CreditHistoryItem[];
  summary?: CreditHistorySummary;
  period?: HistoryPeriod | null;
  total: number;
  page: number;
  limit: number;
}
