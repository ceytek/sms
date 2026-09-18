import { apiRequest } from "@/lib/api";
import type { ContactGroupRecord } from "../types";

export const contactGroupsService = {
  list() {
    return apiRequest<ContactGroupRecord[]>("contact-groups");
  },
  create(data: { name: string; description?: string; parentId?: string; isActive?: boolean }) {
    return apiRequest<ContactGroupRecord>("contact-groups", { method: "POST", body: data });
  },
  update(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
    return apiRequest<ContactGroupRecord>(`contact-groups/${id}`, { method: "PATCH", body: data });
  },
  remove(id: string) {
    return apiRequest<{ id: string }>(`contact-groups/${id}`, { method: "DELETE" });
  },
};
