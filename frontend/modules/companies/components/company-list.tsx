"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Building2, Eye, ChevronDown, Loader2, LogIn, X, Tags } from "lucide-react";
import type { CompanyListItem, CompanyStatus, CustomerType } from "../types";
import { COMPANY_TYPE_LABELS, COMPANY_STATUS_LABELS, CUSTOMER_TYPE_LABELS } from "../types";
import { CustomerCategory, CustomerSubcategory, referenceService } from "../services/reference.service";

interface CompanyListProps {
  companies: CompanyListItem[];
  isLoading?: boolean;
  userRole?: string;
  onSearch: (search: string) => void;
  onStatusFilter: (status: CompanyStatus | "ALL") => void;
  onTypeFilter?: (type: "ALL" | "DEALER" | "CUSTOMER") => void;
  customerTypeFilter?: CustomerType | "ALL";
  categoryIdFilter?: string;
  subcategoryIdFilter?: string;
  onCustomerTypeFilter?: (value: CustomerType | "ALL") => void;
  onCategoryFilter?: (categoryId: string) => void;
  onSubcategoryFilter?: (subcategoryId: string) => void;
  onStatusToggle?: (id: string, newStatus: CompanyStatus) => Promise<void>;
  onImpersonate?: (companyId: string) => Promise<void> | void;
}

function AccountTypeBadge({ isDealer }: { isDealer: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        isDealer
          ? "bg-blue-100 text-blue-700 border-blue-200"
          : "bg-purple-100 text-purple-700 border-purple-200"
      }
    >
      {isDealer ? "Bayi" : "Müşteri"}
    </Badge>
  );
}

export function CompanyList({
  companies,
  isLoading,
  userRole,
  onSearch,
  onStatusFilter,
  onTypeFilter,
  customerTypeFilter = "ALL",
  categoryIdFilter = "",
  subcategoryIdFilter = "",
  onCustomerTypeFilter,
  onCategoryFilter,
  onSubcategoryFilter,
  onStatusToggle,
  onImpersonate,
}: CompanyListProps) {
  const [searchValue, setSearchValue] = useState("");
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; name: string; isDealer: boolean; newStatus: CompanyStatus } | null>(null);
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState("");
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [impersonateError, setImpersonateError] = useState("");
  const [categories, setCategories] = useState<CustomerCategory[]>([]);
  const [subcategories, setSubcategories] = useState<CustomerSubcategory[]>([]);

  useEffect(() => {
    referenceService
      .getCustomerCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!categoryIdFilter) {
      setSubcategories([]);
      return;
    }
    referenceService
      .getCustomerSubcategories(categoryIdFilter)
      .then(setSubcategories)
      .catch(() => setSubcategories([]));
  }, [categoryIdFilter]);

  const hasClassificationFilter =
    customerTypeFilter !== "ALL" || Boolean(categoryIdFilter) || Boolean(subcategoryIdFilter);

  const clearClassification = () => {
    onCustomerTypeFilter?.("ALL");
    onCategoryFilter?.("");
    onSubcategoryFilter?.("");
  };

  const handleSearch = () => {
    onSearch(searchValue);
  };

  const handleToggle = (company: CompanyListItem) => {
    const newStatus: CompanyStatus = company.status === "ACTIVE" ? "PASSIVE" : "ACTIVE";
    setToggleError("");
    setConfirmDialog({ id: company.id, name: company.name, isDealer: company.isDealer, newStatus });
  };

  const confirmToggle = async () => {
    if (!confirmDialog || !onStatusToggle) return;
    setToggling(true);
    setToggleError("");
    try {
      await onStatusToggle(confirmDialog.id, confirmDialog.newStatus);
      setConfirmDialog(null);
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : "İşlem başarısız oldu");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Confirm Dialog Overlay */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${confirmDialog.newStatus === "PASSIVE" ? "bg-red-100" : "bg-emerald-100"}`}>
                <Building2 className={`h-5 w-5 ${confirmDialog.newStatus === "PASSIVE" ? "text-red-600" : "text-emerald-600"}`} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {confirmDialog.newStatus === "PASSIVE" ? "Firmayı Pasife Al" : "Firmayı Aktife Al"}
                </h3>
                <p className="text-sm text-slate-500">{confirmDialog.name}</p>
              </div>
            </div>

            {confirmDialog.newStatus === "PASSIVE" ? (
              <div className="space-y-3 mb-6">
                <p className="text-sm text-slate-600">
                  <strong className="text-red-600">{confirmDialog.name}</strong> firmasını pasife almak istediğinizden emin misiniz?
                </p>
                <div className="rounded-xl bg-red-50 border border-red-100 p-3.5 space-y-1.5">
                  <p className="text-xs font-medium text-red-700">Bu işlem sonucunda:</p>
                  <ul className="text-xs text-red-600 space-y-1 ml-3 list-disc">
                    <li>Bu firmaya ait kullanıcılar giriş yapamayacak</li>
                    {confirmDialog.isDealer && (
                      <li>Bu bayinin tüm alt müşterileri de giriş yapamayacak</li>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600 mb-6">
                <strong className="text-emerald-700">{confirmDialog.name}</strong> firmasını tekrar aktif etmek istediğinizden emin misiniz?
              </p>
            )}

            {toggleError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 mb-4">
                {toggleError}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setConfirmDialog(null)}
                disabled={toggling}
              >
                İptal
              </Button>
              <Button
                className={`flex-1 rounded-xl ${confirmDialog.newStatus === "PASSIVE" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"} text-white`}
                onClick={confirmToggle}
                disabled={toggling}
              >
                {toggling && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {confirmDialog.newStatus === "PASSIVE" ? "Pasife Al" : "Aktife Al"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Firma Yönetimi</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tüm firmaları görüntüleyin ve yönetin
          </p>
        </div>
        <div className="relative">
          {userRole === "DEALER" ? (
            <Link href="/admin/companies/new?type=customer">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Yeni Müşteri
              </Button>
            </Link>
          ) : (
            <>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setShowNewMenu(!showNewMenu)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Yeni Firma
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
              {showNewMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNewMenu(false)}
                  />
                  <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg">
                    <Link
                      href="/admin/companies/new?type=dealer"
                      onClick={() => setShowNewMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg"
                    >
                      <Building2 className="h-4 w-4 text-blue-600" />
                      Yeni Bayi
                    </Link>
                    <Link
                      href="/admin/companies/new?type=customer"
                      onClick={() => setShowNewMenu(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 rounded-b-lg border-t border-slate-100"
                    >
                      <Building2 className="h-4 w-4 text-purple-600" />
                      Yeni Müşteri
                    </Link>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Firma adı veya kodu ile ara..."
              className="pl-9"
            />
          </div>
          <select
            defaultValue="ALL"
            onChange={(e) =>
              onStatusFilter(e.target.value as CompanyStatus | "ALL")
            }
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:w-40"
          >
            <option value="ALL">Tüm Durumlar</option>
            {Object.entries(COMPANY_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            defaultValue="ALL"
            onChange={(e) =>
              onTypeFilter?.(e.target.value as "ALL" | "DEALER" | "CUSTOMER")
            }
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:w-40"
          >
            <option value="ALL">Tümü</option>
            <option value="DEALER">Bayiler</option>
            <option value="CUSTOMER">Müşteriler</option>
          </select>
          <Button variant="outline" onClick={handleSearch}>
            Ara
          </Button>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              <Tags className="h-3.5 w-3.5" />
              Sınıflandırma
            </p>
            {hasClassificationFilter && (
              <button
                type="button"
                onClick={clearClassification}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                <X className="h-3.5 w-3.5" />
                Filtreleri temizle
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1">
              <span className="text-xs text-slate-500">Müşteri Tipi</span>
              <select
                value={customerTypeFilter}
                onChange={(e) => onCustomerTypeFilter?.(e.target.value as CustomerType | "ALL")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">Tümü</option>
                {Object.entries(CUSTOMER_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-500">Ana Kategori</span>
              <select
                value={categoryIdFilter}
                onChange={(e) => {
                  onCategoryFilter?.(e.target.value);
                  onSubcategoryFilter?.("");
                }}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Tümü</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-slate-500">Alt Kategori</span>
              <select
                value={subcategoryIdFilter}
                disabled={!categoryIdFilter}
                onChange={(e) => onSubcategoryFilter?.(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {categoryIdFilter ? "Tümü" : "Önce ana kategori seçin"}
                </option>
                {subcategories.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {impersonateError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {impersonateError}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Firma Kodu</TableHead>
              <TableHead>Firma Adı</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Hesap Türü</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-slate-500">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : companies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="text-slate-500">Firma bulunamadı</p>
                  <Link href="/admin/companies/new">
                    <Button variant="link" className="mt-2 text-blue-600">
                      İlk firmayı oluştur
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              companies.map((company) => (
                <TableRow key={company.id} className="hover:bg-slate-50">
                  <TableCell className="font-mono text-sm text-blue-600">
                    {company.companyCode}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {company.name}
                  </TableCell>
                  <TableCell>
                    {company.categoryName || company.customerType ? (
                      <div>
                        <div className="text-sm text-slate-800">
                          {[company.categoryName, company.subcategoryName].filter(Boolean).join(" / ") || "—"}
                        </div>
                        {company.customerType && (
                          <div className="text-xs text-slate-400">
                            {CUSTOMER_TYPE_LABELS[company.customerType]}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {COMPANY_TYPE_LABELS[company.companyType]}
                  </TableCell>
                  <TableCell>
                    <AccountTypeBadge isDealer={company.isDealer} />
                  </TableCell>
                  <TableCell>
                    {/* Status Switch */}
                    <button
                      onClick={() => handleToggle(company)}
                      className="group flex items-center gap-2"
                      title={company.status === "ACTIVE" ? "Pasife al" : "Aktife al"}
                    >
                      <div className={`relative h-5 w-9 rounded-full transition-colors ${company.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-300"}`}>
                        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${company.status === "ACTIVE" ? "translate-x-4" : "translate-x-0.5"}`} />
                      </div>
                      <span className={`text-xs font-medium ${company.status === "ACTIVE" ? "text-emerald-700" : "text-slate-500"}`}>
                        {COMPANY_STATUS_LABELS[company.status]}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(userRole === "ADMIN" || !company.isDealer) && company.status === "ACTIVE" && onImpersonate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          disabled={impersonatingId === company.id}
                          onClick={async () => {
                            setImpersonateError("");
                            setImpersonatingId(company.id);
                            try {
                              await onImpersonate(company.id);
                            } catch (err) {
                              setImpersonateError(
                                err instanceof Error ? err.message : "Giriş yapılamadı",
                              );
                              setImpersonatingId(null);
                            }
                          }}
                        >
                          {impersonatingId === company.id ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <LogIn className="mr-1 h-4 w-4" />
                          )}
                          Giriş
                        </Button>
                      )}
                      <Link href={`/admin/companies/${company.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="mr-1 h-4 w-4" />
                          Detay
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
