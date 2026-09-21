"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Ban,
  Building2,
  Check,
  Hash,
  Loader2,
  Plus,
  Search,
  Store,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { originatorsService } from "../services/originators.service";
import type { OriginatorCompany, OriginatorRecord } from "../types";
import { ORIGINATOR_STATUS_LABELS } from "../types";
import { originatorStatusBadgeClass } from "./originator-status";
import { OriginatorBanDialog } from "./originator-ban-dialog";

type TypeFilter = "ALL" | "DEALER" | "CUSTOMER";

export function OriginatorsManager({ userRole }: { userRole: string }) {
  const isAdmin = userRole === "ADMIN";
  const [companies, setCompanies] = useState<OriginatorCompany[]>([]);
  const [dealerPending, setDealerPending] = useState<OriginatorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [error, setError] = useState("");

  const [selected, setSelected] = useState<OriginatorCompany | null>(null);
  const [originators, setOriginators] = useState<OriginatorRecord[]>([]);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmBan, setConfirmBan] = useState<OriginatorRecord | null>(null);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await originatorsService.listCompanies({
        search: search || undefined,
        isDealer: typeFilter === "ALL" ? undefined : typeFilter === "DEALER",
      });
      setCompanies(result.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Firmalar yüklenemedi");
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  const loadCompanyTitles = useCallback(async (company: OriginatorCompany) => {
    setLoadingTitles(true);
    try {
      const result = await originatorsService.list({ companyId: company.id, limit: 100 });
      setOriginators(result.items ?? []);
      if (company.isDealer) {
        const pending = await originatorsService.listPending(company.id);
        setDealerPending(pending.items ?? []);
      } else {
        setDealerPending([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Başlıklar yüklenemedi");
      setOriginators([]);
      setDealerPending([]);
    } finally {
      setLoadingTitles(false);
    }
  }, []);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const openCompany = (company: OriginatorCompany) => {
    setSelected(company);
    setNewName("");
    void loadCompanyTitles(company);
  };

  const refreshSelected = async () => {
    if (!selected) return;
    await Promise.all([loadCompanyTitles(selected), loadCompanies()]);
  };

  const handleAdd = async () => {
    if (!selected || !newName.trim()) return;
    setAdding(true);
    setError("");
    try {
      await originatorsService.create({ companyId: selected.id, name: newName });
      setNewName("");
      await refreshSelected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Başlık eklenemedi");
    } finally {
      setAdding(false);
    }
  };

  const handleStatus = async (id: string, status: "ACTIVE" | "PASSIVE") => {
    setBusyId(id);
    setError("");
    try {
      await originatorsService.updateStatus(id, status);
      if (selected) {
        await refreshSelected();
      } else {
        await loadCompanies();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Durum güncellenemedi");
    } finally {
      setBusyId(null);
    }
  };

  const handleBanExisting = async () => {
    if (!confirmBan) return;
    setBusyId(confirmBan.id);
    setError("");
    try {
      await originatorsService.banExisting(confirmBan.id);
      setConfirmBan(null);
      await refreshSelected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yasaklanamadı");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Originatör Yönetimi</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAdmin
            ? "Bayi ve müşteri başlıklarını buradan tanımlayın, onaylayın veya pasife alın."
            : "Müşterilerinizin başlıklarını görün ve talep ekleyin. Aktif etme ana bayi onayına bağlıdır."}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Firma adı veya kod ara"
                className="pl-9"
              />
            </div>
            {isAdmin && (
              <div className="flex rounded-lg border border-slate-200 p-1">
                {(
                  [
                    ["ALL", "Tümü"],
                    ["DEALER", "Bayiler"],
                    ["CUSTOMER", "Müşteriler"],
                  ] as [TypeFilter, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTypeFilter(value)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                      typeFilter === value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : companies.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              Bu filtreye uygun firma bulunamadı.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Firma</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Başlıklar</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id} className="align-middle">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            company.isDealer ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"
                          }`}
                        >
                          {company.isDealer ? <Store className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{company.name}</div>
                          <div className="text-xs text-slate-500">
                            {company.companyCode}
                            {company.dealerCompanyName ? ` · Bayi: ${company.dealerCompanyName}` : ""}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          company.isDealer
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-violet-50 text-violet-700 border-violet-200"
                        }
                      >
                        {company.isDealer ? "Bayi" : "Müşteri"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {company.counts.total} başlık
                        </span>
                        {company.counts.active > 0 && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            {company.counts.active} aktif
                          </span>
                        )}
                        {company.counts.pending > 0 && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            {company.counts.pending} onay
                          </span>
                        )}
                        {company.counts.passive > 0 && (
                          <span className="rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
                            {company.counts.passive} pasif
                          </span>
                        )}
                        {(company.customerPending ?? 0) > 0 && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                            {company.customerPending} müşteri talebi
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openCompany(company)}>
                        <Hash className="mr-1.5 h-3.5 w-3.5" />
                        Originatörler
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
          <button type="button" className="h-full flex-1" onClick={() => setSelected(null)} aria-label="Kapat" />
          <aside className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Originatörler</p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">{selected.name}</h2>
                <p className="text-sm text-slate-500">{selected.companyCode}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-slate-100 px-5 py-4">
              {!isAdmin && (
                <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Yeni başlık onay bekliyor olarak kaydedilir. Ana bayi onayından sonra aktif edilir.
                </p>
              )}
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value.toUpperCase())}
                  maxLength={11}
                  placeholder="Yeni başlık"
                  className="font-mono"
                />
                <Button onClick={() => void handleAdd()} disabled={!newName.trim() || adding}>
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Ekle
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {loadingTitles ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : originators.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  Bu firmada henüz başlık yok.
                </div>
              ) : (
                <div className="space-y-3">
                  {originators.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-mono text-base font-bold text-slate-900">{item.name}</div>
                          <Badge variant="outline" className={`mt-2 ${originatorStatusBadgeClass(item.status)}`}>
                            {ORIGINATOR_STATUS_LABELS[item.status]}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {isAdmin && item.status !== "ACTIVE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === item.id}
                            onClick={() => void handleStatus(item.id, "ACTIVE")}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Aktif et
                          </Button>
                        )}
                        {isAdmin && item.status === "ACTIVE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === item.id}
                            onClick={() => void handleStatus(item.id, "PASSIVE")}
                          >
                            Pasife al
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            disabled={busyId === item.id}
                            onClick={() => setConfirmBan(item)}
                          >
                            <Ban className="mr-1 h-3.5 w-3.5" />
                            Yasakla
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isAdmin && selected.isDealer && (
                <div className="mt-8">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Bekleyen müşteri talepleri</h3>
                  {dealerPending.length === 0 ? (
                    <p className="text-sm text-slate-500">Bu bayinin bekleyen müşteri talebi yok.</p>
                  ) : (
                    <div className="space-y-3">
                      {dealerPending.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                          <div className="font-mono text-base font-bold text-slate-900">{item.name}</div>
                          <p className="mt-1 text-sm text-slate-600">
                            {item.companyName} · {item.companyCode}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === item.id}
                              onClick={() => void handleStatus(item.id, "ACTIVE")}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" />
                              Aktif et
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              disabled={busyId === item.id}
                              onClick={() => setConfirmBan(item)}
                            >
                              <Ban className="mr-1 h-3.5 w-3.5" />
                              Yasakla
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 px-5 py-3">
              <Link href={`/admin/companies/${selected.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                Firma detayına git
              </Link>
            </div>
          </aside>
        </div>
      )}

      <OriginatorBanDialog
        item={confirmBan}
        onCancel={() => setConfirmBan(null)}
        onConfirm={() => void handleBanExisting()}
      />
    </div>
  );
}
