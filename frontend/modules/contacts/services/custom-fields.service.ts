import { apiRequest } from "@/lib/api";
import type { ContactCustomFieldRecord, ContactCustomFieldType } from "../types";

export const contactCustomFieldsService = {
  list() {
    return apiRequest<ContactCustomFieldRecord[]>("contact-custom-fields");
  },
  create(data: { name: string; fieldType?: ContactCustomFieldType }) {
    return apiRequest<ContactCustomFieldRecord>("contact-custom-fields", { method: "POST", body: data });
  },
  update(id: string, data: { name?: string; fieldType?: ContactCustomFieldType }) {
    return apiRequest<ContactCustomFieldRecord>(`contact-custom-fields/${id}`, { method: "PATCH", body: data });
  },
  remove(id: string) {
    return apiRequest<{ id: string }>(`contact-custom-fields/${id}`, { method: "DELETE" });
  },
};
