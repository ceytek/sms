export interface MessagingSegment {
  subcategoryId: string;
  name: string;
  categoryName: string;
  companyCount: number;
}

export interface MessagingRecipient {
  companyId: string;
  companyName: string;
  subcategoryName: string;
  mobile?: string;
}

export interface MessagingPreview {
  sendType: string;
  audienceSource: string;
  selectedTypeCount: number;
  companyCount: number;
  validRecipientCount: number;
  invalidRecipientCount: number;
  duplicateCount: number;
  excludedCount: number;
  segments: MessagingSegment[];
  recipients: MessagingRecipient[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateCampaignResult {
  id: string;
  sendType: string;
  audienceSource: string;
  status: string;
  isMock: boolean;
  message: string;
  selectedTypeCount: number;
  companyCount: number;
  validRecipientCount: number;
  invalidRecipientCount: number;
  duplicateCount: number;
  excludedCount: number;
  smsParts: number;
  estimatedUnits: number;
}

export interface BasketItem {
  subcategoryId: string;
  name: string;
  categoryName: string;
  companyCount: number;
}
