export type CompanyType = "CORPORATE" | "INDIVIDUAL";
export type CustomerType =
  | "PRIVATE_SECTOR"
  | "PUBLIC"
  | "NGO_CHAMBER"
  | "DEALER_PARTNER"
  | "INDIVIDUAL_BUSINESS";
export type CompanyStatus = "ACTIVE" | "PASSIVE" | "SUSPENDED";
export type ContactType = "MANAGER" | "TECHNICAL" | "ACCOUNTING" | "PERSONNEL";
export type IpRuleType = "NO_CONTROL" | "ALLOW_LIST" | "BLOCK_LIST";
export type NotificationType = "EMAIL" | "SMS" | "BOTH";
export type OriginatorStatus = "PENDING" | "ACTIVE" | "REJECTED" | "PASSIVE";
export type AccountType = "DEALER" | "CUSTOMER";

export interface CompanyListItem {
  id: string;
  companyCode: string;
  name: string;
  companyType: CompanyType;
  status: CompanyStatus;
  isSubAccount: boolean;
  isDealer: boolean;
  email?: string;
  phone?: string;
  createdAt: string;
  customerType?: CustomerType;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  smsBalance?: number;
  smsProviders?: { providerId: string; name: string; creditRefundRate?: number | null }[];
}

export interface CompanyContact {
  id?: string;
  name: string;
  contactType: ContactType;
  mobile?: string;
  phone?: string;
  email?: string;
  description?: string;
}

export interface CompanySmsAccount {
  id?: string;
  providerId: string;
  providerName?: string;
  username?: string;
  subscriberNo?: string;
  creditRefundRate?: number | null;
  singleSendLimit?: number;
  applyToSubAccounts: boolean;
  noRouting: boolean;
  isActive: boolean;
}

export interface CompanyOriginator {
  id?: string;
  name: string;
  status: OriginatorStatus;
  providerReference?: string;
}

export interface CompanyCreditAlert {
  id?: string;
  threshold: number;
  message: string;
  notificationType: NotificationType;
  sortOrder: number;
  isActive: boolean;
}

export interface CompanyIpRule {
  id?: string;
  ipAddress: string;
  description?: string;
  isActive: boolean;
}

export interface CompanySecuritySettings {
  ipRuleType: IpRuleType;
  filePassword?: string;
}

export interface CompanyServiceAssignment {
  serviceId: string;
  serviceName?: string;
  serviceCode?: string;
  billingPeriod?: "ALWAYS" | "ANNUAL";
  isActive: boolean;
  startsYear?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  expired?: boolean;
  daysLeft?: number | null;
}

export interface CompanyDetail extends CompanyListItem {
  parentCompanyId?: string;
  dealerCompanyId?: string;
  parentCompanyName?: string;
  dealerCompanyName?: string;
  taxOffice?: string;
  taxNumber?: string;
  nationalId?: string;
  birthDate?: string;
  serialNumber?: string;
  cityId?: number;
  districtId?: number;
  cityName?: string;
  districtName?: string;
  customerType?: CustomerType;
  categoryId?: string;
  categoryName?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  address?: string;
  mobile?: string;
  showAnnouncement: boolean;
  documentsCompleted: boolean;
  documentProcessStatus?: "in_progress" | "completed";
  documentAvailableCount?: number;
  documentTotalCount?: number;
  contacts: CompanyContact[];
  smsAccounts: CompanySmsAccount[];
  originators: CompanyOriginator[];
  creditAlerts: CompanyCreditAlert[];
  securitySettings: CompanySecuritySettings;
  ipRules: CompanyIpRule[];
  services: CompanyServiceAssignment[];
  priceListId?: string;
  priceListName?: string;
  smsBalance?: number;
  aiBalance?: number;
}

export interface CreateCompanyContactDto {
  name: string;
  contactType: ContactType;
  mobile?: string;
  phone?: string;
  email?: string;
  description?: string;
}

export interface CreateSmsAccountDto {
  providerId: string;
  username?: string;
  subscriberNo?: string;
  creditRefundRate?: number;
  singleSendLimit?: number;
  applyToSubAccounts: boolean;
  noRouting: boolean;
  isActive: boolean;
}

export interface CreateOriginatorDto {
  name: string;
  status?: OriginatorStatus;
  providerReference?: string;
}

export interface CreateCreditAlertDto {
  threshold: number;
  message: string;
  notificationType: NotificationType;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateIpRuleDto {
  ipAddress: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateSecurityDto {
  ipRuleType?: IpRuleType;
  filePassword?: string;
  ipRules?: CreateIpRuleDto[];
}

export interface CreateCompanyServiceDto {
  serviceId: string;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface CreateCompanyDto {
  companyType: CompanyType;
  customerType?: CustomerType;
  categoryId?: string;
  subcategoryId?: string;
  name: string;
  taxOffice?: string;
  taxNumber?: string;
  nationalId?: string;
  birthDate?: string;
  serialNumber?: string;
  isSubAccount?: boolean;
  isDealer?: boolean;
  parentCompanyId?: string;
  dealerCompanyId?: string;
  cityId?: number;
  districtId?: number;
  address?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  contacts?: CreateCompanyContactDto[];
  smsAccounts?: CreateSmsAccountDto[];
  originators?: CreateOriginatorDto[];
  creditAlerts?: CreateCreditAlertDto[];
  security?: CreateSecurityDto;
  services?: CreateCompanyServiceDto[];
  priceListId?: string;
  accountUsername?: string;
  accountPassword?: string;
}

export interface GeneratedCredentials {
  companyCode: string;
  username: string;
  password: string;
  role: string;
}

export interface CreateCompanyResponse extends CompanyDetail {
  generatedCredentials?: GeneratedCredentials;
}

export interface CompanyListQuery {
  search?: string;
  status?: CompanyStatus;
  isDealer?: boolean;
  customerType?: CustomerType;
  categoryId?: string;
  subcategoryId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  data?: T[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  total?: number;
  page?: number;
  limit?: number;
}

export interface WizardContact {
  name: string;
  contactType: ContactType;
  phone: string;
  mobile: string;
  email: string;
}

export interface CompanyWizardData {
  accountType: AccountType;
  companyType: CompanyType;
  customerType: CustomerType | "";
  categoryId: string;
  subcategoryId: string;
  name: string;
  taxOffice: string;
  taxNumber: string;
  nationalId: string;
  birthDate: string;
  serialNumber: string;
  cityId: number | undefined;
  districtId: number | undefined;
  address: string;
  phone: string;
  mobile: string;
  email: string;
  smsProviderId: string;
  smsUsername: string;
  smsSubscriberNo: string;
  enableCreditRefund: boolean;
  creditRefundRate: string;
  originators: string[];
  priceListId: string;
  enabledServiceIds: string[];
  accountUsername: string;
  accountPassword: string;
  contacts: WizardContact[];
}

export const defaultWizardData: CompanyWizardData = {
  accountType: "CUSTOMER",
  companyType: "CORPORATE",
  customerType: "",
  categoryId: "",
  subcategoryId: "",
  name: "",
  taxOffice: "",
  taxNumber: "",
  nationalId: "",
  birthDate: "",
  serialNumber: "",
  cityId: undefined,
  districtId: undefined,
  address: "",
  phone: "",
  mobile: "",
  email: "",
  smsProviderId: "",
  smsUsername: "",
  smsSubscriberNo: "",
  enableCreditRefund: false,
  creditRefundRate: "",
  originators: [],
  priceListId: "",
  enabledServiceIds: [],
  accountUsername: "",
  accountPassword: "",
  contacts: [],
};

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  CORPORATE: "Kurumsal",
  INDIVIDUAL: "Bireysel",
};

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  PRIVATE_SECTOR: "Özel Sektör",
  PUBLIC: "Kamu",
  NGO_CHAMBER: "STK / Oda",
  DEALER_PARTNER: "Bayi / İş Ortağı",
  INDIVIDUAL_BUSINESS: "Bireysel İşletme",
};

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  ACTIVE: "Aktif",
  PASSIVE: "Pasif",
  SUSPENDED: "Askıda",
};

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  MANAGER: "Yönetici",
  TECHNICAL: "Teknik",
  ACCOUNTING: "Muhasebe",
  PERSONNEL: "Personel",
};

export const IP_RULE_TYPE_LABELS: Record<IpRuleType, string> = {
  NO_CONTROL: "Kontrol Yok",
  ALLOW_LIST: "İzin Listesi",
  BLOCK_LIST: "Engel Listesi",
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  EMAIL: "E-posta",
  SMS: "SMS",
  BOTH: "Her İkisi",
};

export const ORIGINATOR_STATUS_LABELS: Record<OriginatorStatus, string> = {
  PENDING: "Onay bekliyor",
  ACTIVE: "Aktif",
  REJECTED: "Reddedildi",
  PASSIVE: "Pasif",
};
