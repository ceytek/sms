import { apiRequest } from "@/lib/api";
import type { ContactTagRecord } from "../types";

export const contactTagsService = {
  list() {
    return apiRequest<ContactTagRecord[]>("contact-tags");
  },
  create(data: { name: string; isActive?: boolean }) {
    return apiRequest<ContactTagRecord>("contact-tags", { method: "POST", body: data });
  },
  update(id: string, data: { name?: string; isActive?: boolean }) {
    return apiRequest<ContactTagRecord>(`contact-tags/${id}`, { method: "PATCH", body: data });
  },
  remove(id: string) {
    return apiRequest<{ id: string }>(`contact-tags/${id}`, { method: "DELETE" });
  },
};
