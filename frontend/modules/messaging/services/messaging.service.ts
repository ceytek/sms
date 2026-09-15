import { apiRequest } from "@/lib/api";
import type { CreateCampaignResult, MessagingPreview } from "../types";

export const messagingService = {
  preview(data: {
    subcategoryIds: string[];
    excludedCompanyIds?: string[];
    page?: number;
    limit?: number;
  }) {
    return apiRequest<MessagingPreview>("admin/messaging/preview", {
      method: "POST",
      body: data,
    });
  },

  createCampaign(data: {
    subcategoryIds: string[];
    excludedCompanyIds?: string[];
    body: string;
  }) {
    return apiRequest<CreateCampaignResult>("admin/messaging/campaigns", {
      method: "POST",
      body: data,
    });
  },
};
