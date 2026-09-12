import { apiRequest } from "@/lib/api";
import {
  AssignPriceListDto,
  CompanyPriceListAssignment,
  CreatePriceListDto,
  PriceList,
  PriceListAssignment,
  PriceListItem,
  UpdatePriceListItemDto,
} from "../types";

const MOCK_PRICE_LISTS: PriceList[] = [
  {
    id: "mock-platform-default",
    name: "Standart Platform Fiyat Listesi",
    listType: "PLATFORM",
    currency: "TRY",
    isActive: true,
    items: [
      {
        id: "item-1",
        priceListId: "mock-platform-default",
        productId: "prod-sms-1000",
        productCode: "SMS_1000",
        productName: "1000 SMS Paketi",
        unitPrice: 0.045,
      },
      {
        id: "item-2",
        priceListId: "mock-platform-default",
        productId: "prod-sms-5000",
        productCode: "SMS_5000",
        productName: "5000 SMS Paketi",
        unitPrice: 0.038,
      },
      {
        id: "item-3",
        priceListId: "mock-platform-default",
        productId: "prod-ai-100",
        productCode: "AI_100",
        productName: "100 AI Kontör",
        unitPrice: 0.25,
      },
    ],
  },
  {
    id: "mock-dealer-premium",
    name: "Bayi Premium Fiyat Listesi",
    listType: "DEALER",
    currency: "TRY",
    isActive: true,
    items: [
      {
        id: "item-4",
        priceListId: "mock-dealer-premium",
        productId: "prod-sms-1000",
        productCode: "SMS_1000",
        productName: "1000 SMS Paketi",
        unitPrice: 0.042,
      },
      {
        id: "item-5",
        priceListId: "mock-dealer-premium",
        productId: "prod-sms-5000",
        productCode: "SMS_5000",
        productName: "5000 SMS Paketi",
        unitPrice: 0.035,
      },
    ],
  },
];

let mockLists = structuredClone(MOCK_PRICE_LISTS);

export const pricingService = {
  async listPriceLists(): Promise<PriceList[]> {
    try {
      return await apiRequest<PriceList[]>("admin/pricing/lists");
    } catch {
      return mockLists;
    }
  },

  async getPriceList(id: string): Promise<PriceList> {
    try {
      return await apiRequest<PriceList>(`admin/pricing/lists/${id}`);
    } catch {
      const list = mockLists.find((l) => l.id === id);
      if (!list) throw new Error("Fiyat listesi bulunamadı");
      return list;
    }
  },

  async getListItems(priceListId: string): Promise<PriceListItem[]> {
    try {
      return await apiRequest<PriceListItem[]>(
        `admin/pricing/lists/${priceListId}/items`
      );
    } catch {
      return [];
    }
  },

  async createPriceList(data: CreatePriceListDto): Promise<PriceList> {
    try {
      return await apiRequest<PriceList>("admin/pricing/lists", {
        method: "POST",
        body: data,
      });
    } catch {
      const newList: PriceList = {
        id: `mock-${Date.now()}`,
        name: data.name,
        listType: data.listType,
        currency: data.currency ?? "TRY",
        validFrom: data.validFrom,
        validTo: data.validTo,
        isActive: data.isActive ?? true,
        items: [],
      };
      mockLists = [...mockLists, newList];
      return newList;
    }
  },

  async updatePriceListItems(
    priceListId: string,
    items: UpdatePriceListItemDto[]
  ): Promise<PriceList> {
    try {
      return await apiRequest<PriceList>(
        `admin/pricing/lists/${priceListId}/items`,
        { method: "PUT", body: { items } }
      );
    } catch {
      mockLists = mockLists.map((list) => {
        if (list.id !== priceListId) return list;
        const updatedItems = (list.items ?? []).map((item) => {
          const update = items.find((u) => u.productId === item.productId);
          return update ? { ...item, unitPrice: update.unitPrice } : item;
        });
        return { ...list, items: updatedItems };
      });
      const list = mockLists.find((l) => l.id === priceListId);
      if (!list) throw new Error("Fiyat listesi bulunamadı");
      return list;
    }
  },

  async assignPriceList(data: AssignPriceListDto): Promise<CompanyPriceListAssignment> {
    return apiRequest<CompanyPriceListAssignment>("admin/pricing/assign", {
      method: "POST",
      body: data,
    });
  },

  async getListAssignments(priceListId: string): Promise<PriceListAssignment[]> {
    try {
      return await apiRequest<PriceListAssignment[]>(
        `admin/pricing/lists/${priceListId}/assignments`
      );
    } catch {
      return [];
    }
  },

  async getCompanyAssignments(companyId?: string): Promise<CompanyPriceListAssignment[]> {
    const qs = companyId ? `?companyId=${companyId}` : "";
    try {
      return await apiRequest<CompanyPriceListAssignment[]>(
        `admin/pricing/assignments${qs}`
      );
    } catch {
      return [];
    }
  },
};
