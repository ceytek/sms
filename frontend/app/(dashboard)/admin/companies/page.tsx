"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/modules/auth";
import {
  CompanyList,
  companyService,
  CompanyListItem,
} from "@/modules/companies";
import type { CompanyStatus, CustomerType } from "@/modules/companies";

export default function CompaniesPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | "ALL">("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "DEALER" | "CUSTOMER">("ALL");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<CustomerType | "ALL">("ALL");
  const [categoryIdFilter, setCategoryIdFilter] = useState("");
  const [subcategoryIdFilter, setSubcategoryIdFilter] = useState("");
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const user = authService.getUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "DEALER")) {
      router.push("/");
      return;
    }
    setUserRole(user.role);
  }, [router]);

  const loadCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await companyService.list({
        search: search || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        isDealer: typeFilter === "ALL" ? undefined : typeFilter === "DEALER",
        customerType: customerTypeFilter === "ALL" ? undefined : customerTypeFilter,
        categoryId: categoryIdFilter || undefined,
        subcategoryId: subcategoryIdFilter || undefined,
      });
      setCompanies(result.items ?? result.data ?? []);
    } catch {
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, typeFilter, customerTypeFilter, categoryIdFilter, subcategoryIdFilter]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleStatusToggle = async (id: string, newStatus: CompanyStatus) => {
    await companyService.updateStatus(id, newStatus);
    await loadCompanies();
  };

  const handleImpersonate = async (companyId: string) => {
    const tab = window.open("about:blank", "_blank");
    if (!tab) {
      throw new Error("Pop-up engellendi. Lütfen bu site için pop-up izni verin.");
    }

    try {
      const response = await authService.impersonate(companyId);
      authService.openImpersonationTab(response, tab);
    } catch (err) {
      tab.close();
      throw err;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <CompanyList
        companies={companies}
        isLoading={isLoading}
        userRole={userRole}
        onSearch={setSearch}
        onStatusFilter={setStatusFilter}
        onTypeFilter={setTypeFilter}
        customerTypeFilter={customerTypeFilter}
        categoryIdFilter={categoryIdFilter}
        subcategoryIdFilter={subcategoryIdFilter}
        onCustomerTypeFilter={setCustomerTypeFilter}
        onCategoryFilter={(id: string) => {
          setCategoryIdFilter(id);
          setSubcategoryIdFilter("");
        }}
        onSubcategoryFilter={setSubcategoryIdFilter}
        onStatusToggle={handleStatusToggle}
        onImpersonate={handleImpersonate}
        onProviderChange={async (id, providerId, creditRefundRate) => {
          await companyService.updateSmsProvider(id, { providerId, creditRefundRate });
          await loadCompanies();
        }}
      />
    </div>
  );
}
