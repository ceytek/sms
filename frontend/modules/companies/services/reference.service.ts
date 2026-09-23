import { apiRequest } from "@/lib/api";

export interface City {
  id: number;
  name: string;
  plateCode: string;
}

export interface District {
  id: number;
  name: string;
  cityId: number;
}

export interface SmsProvider {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface Service {
  id: string;
  code: string;
  name: string;
  description?: string;
  billingPeriod?: "ALWAYS" | "ANNUAL";
  termMonths?: number;
  isActive: boolean;
}

export const DEFAULT_SERVICE_CODE = "SMS";

export interface CustomerCategory {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CustomerSubcategory {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  creditAmount: number;
  productType: "SMS" | "AI";
  isActive: boolean;
}

export const referenceService = {
  async getCities(): Promise<City[]> {
    return apiRequest<City[]>("reference/cities");
  },

  async getDistricts(cityId: number): Promise<District[]> {
    return apiRequest<District[]>(`reference/districts/${cityId}`);
  },

  async getSmsProviders(): Promise<SmsProvider[]> {
    return apiRequest<SmsProvider[]>("reference/sms-providers");
  },

  async getServices(): Promise<Service[]> {
    return apiRequest<Service[]>("reference/services");
  },

  async getProducts(): Promise<Product[]> {
    return apiRequest<Product[]>("reference/products");
  },

  async getCustomerCategories(): Promise<CustomerCategory[]> {
    return apiRequest<CustomerCategory[]>("reference/customer-categories");
  },

  async getCustomerSubcategories(categoryId: string): Promise<CustomerSubcategory[]> {
    return apiRequest<CustomerSubcategory[]>(
      `reference/customer-categories/${categoryId}/subcategories`,
    );
  },
};
