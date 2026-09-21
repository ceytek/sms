import { apiRequest } from "@/lib/api";

export type OriginatorRestrictionType = "BLACKLIST" | "SMS_BLOCKED";

export interface RestrictionOriginator {
  id: string;
  name: string;
  status: string;
  providerName?: string | null;
}

export interface OriginatorRestrictionRecord {
  id: string;
  originatorId: string;
  originatorName: string;
  providerName?: string | null;
  restrictionType: OriginatorRestrictionType;
  mobilePhone: string;
  formattedPhone: string;
  firstName: string;
  lastName: string;
  notes: string;
  createdAt: string;
}

export const originatorRestrictionsService = {
  listOriginators() {
    return apiRequest<RestrictionOriginator[]>("originator-restrictions/originators");
  },

  list(params: {
    type: OriginatorRestrictionType;
    originatorId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    query.set("type", params.type);
    if (params.originatorId) query.set("originatorId", params.originatorId);
    if (params.search) query.set("search", params.search);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    return apiRequest<{ items: OriginatorRestrictionRecord[]; total: number; page: number; limit: number }>(
      `originator-restrictions?${query.toString()}`,
    );
  },

  create(data: {
    originatorId: string;
    type: OriginatorRestrictionType;
    mobilePhone: string;
    firstName?: string;
    lastName?: string;
    notes?: string;
  }) {
    return apiRequest<OriginatorRestrictionRecord>("originator-restrictions", {
      method: "POST",
      body: data,
    });
  },

  createBulk(data: { originatorId: string; type: OriginatorRestrictionType; numbers: string[] }) {
    return apiRequest<{ created: number; skipped: number; errors: string[] }>("originator-restrictions/bulk", {
      method: "POST",
      body: data,
    });
  },

  remove(id: string) {
    return apiRequest<{ id: string }>(`originator-restrictions/${id}`, { method: "DELETE" });
  },
};

export function originatorLabel(item: {
  name?: string;
  originatorName?: string;
  providerName?: string | null;
}) {
  const name = item.name || item.originatorName || "";
  return item.providerName ? `${name} · ${item.providerName}` : name;
}
