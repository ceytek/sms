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
  ShieldAlert,
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
import type {
  BannedOriginator,
  OriginatorCompany,
  OriginatorRecord,
  OriginatorStatus,
} from "../types";
import { ORIGINATOR_STATUS_LABELS } from "../types";

type TypeFilter = "ALL" | "DEALER" | "CUSTOMER";

function statusBadgeClass(status: OriginatorStatus) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "PENDING") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "PASSIVE") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-red-50 text-red-600 border-red-200";
}

export function OriginatorsManager({ userRole }: { userRole: string }) {
  const isAdmin = userRole === "ADMIN";
  const [tab, setTab] = useState<"companies" | "pending" | "banned">("companies");
  const [companies, setCompanies] = useState<OriginatorCompany[]>([]);
  const [pendingRequests, setPendingRequests] = useState<OriginatorRecord[]>([]);
  const [dealerPending, setDealerPending] = useState<OriginatorRecord[]>([]);
  const [banned, setBanned] = useState<BannedOriginator[]>([]);
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

  const [bannedName, setBannedName] = useState("");
  const [bannedReason, setBannedReason] = useState("");
  const [savingBanned, setSavingBanned] = useState(false);

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

  const loadBanned = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const result = await originatorsService.listBanned();
      setBanned(result.items ?? []);
    } catch {
      setBanned([]);
    }
  }, [isAdmin]);

  const loadPending = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const result = await originatorsService.listPending();
      setPendingRequests(result.items ?? []);
    } catch {
      setPendingRequests([]);
    }
  }, [isAdmin]);

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
    void loadPending();
  }, [loadCompanies, loadPending]);

  useEffect(() => {
    if (tab === "banned") void loadBanned();
    if (tab === "pending") void loadPending();
  }, [tab, loadBanned, loadPending]);

  const openCompany = (company: OriginatorCompany) => {
    setSelected(company);
    setNewName("");
    void loadCompanyTitles(company);
  };

  const refreshSelected = async () => {
    if (!selected) return;
    await Promise.all([loadCompanyTitles(selected), loadCompanies(), loadPending()]);
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
      if (selected) await refreshSelected();
      else await Promise.all([loadCompanies(), loadPending()]);
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
      await Promise.all([refreshSelected(), loadBanned(), loadPending()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yasaklanamadı");
    } finally {
      setBusyId(null);
    }
  };

  const handleAddBanned = async () => {
    setSavingBanned(true);
    setError("");
    try {
      await originatorsService.addBanned({
        name: bannedName,
        reason: bannedReason || undefined,
      });
      setBannedName("");
      setBannedReason("");
      await Promise.all([loadBanned(), loadCompanies()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yasaklı başlık eklenemedi");
    } finally {
      setSavingBanned(false);
    }
  };

  const handleRemoveBanned = async (id: string) => {
    setBusyId(id);
    setError("");
    try {
      await originatorsService.removeBanned(id);
      await loadBanned();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt silinemedi");
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
            ? "Firma bazında başlıkları görün, ekleyin, aktif/pasif yapın veya yasaklayın."
            : "Müşterilerinizin başlıklarını görün ve talep ekleyin. Aktif etme ana bayi onayına bağlıdır."}
        </p>
      </div>

      {isAdmin && (
        <div className="mb-5 flex w-fit rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setTab("companies")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === "companies" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Firmalar
          </button>
          <button
            type="button"
            onClick={() => setTab("pending")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === "pending" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Bekleyen istekler{pendingRequests.length ? ` (${pendingRequests.length})` : ""}
          </button>
          <button
            type="button"
            onClick={() => setTab("banned")}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              tab === "banned" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Yasaklı Originatörler
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {tab === "companies" ? (
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
      ) : tab === "pending" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Bayilerin müşteri talepleri</h2>
            <p className="mt-1 text-sm text-slate-500">
              Alt bayilerin müşterileri için açtığı başlıklar burada onaylanır. Müşteri firmaları ana listede görünmez.
            </p>
          </div>
          {pendingRequests.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">Bekleyen müşteri talebi yok.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Bayi</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRequests.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono font-semibold">{item.name}</TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{item.companyName}</div>
                      <div className="text-xs text-slate-500">{item.companyCode}</div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{item.dealerCompanyName || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Yasaklı listeye eklenen başlık bir daha tanımlanamaz. Aynı isimdeki mevcut başlıklar otomatik pasife alınır.
          </div>
          <div className="mb-5 grid gap-3 sm:grid-cols-[160px_1fr_auto]">
            <Input
              value={bannedName}
              onChange={(event) => setBannedName(event.target.value.toUpperCase())}
              maxLength={11}
              placeholder="YASAKLIADI"
              className="font-mono"
            />
            <Input
              value={bannedReason}
              onChange={(event) => setBannedReason(event.target.value)}
              placeholder="Gerekçe (opsiyonel)"
            />
            <Button onClick={() => void handleAddBanned()} disabled={!bannedName.trim() || savingBanned}>
              {savingBanned ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yasaklıya ekle"}
            </Button>
          </div>
          {banned.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Yasaklı başlık yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Gerekçe</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banned.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono font-semibold">{item.name}</TableCell>
                    <TableCell className="text-slate-500">{item.reason || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === item.id}
                        onClick={() => void handleRemoveBanned(item.id)}
                      >
                        Listeden çıkar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

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
                          <Badge variant="outline" className={`mt-2 ${statusBadgeClass(item.status)}`}>
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

      {confirmBan && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Başlığı yasakla</h2>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-mono font-semibold">{confirmBan.name}</span> yasaklı listeye eklenecek.
              Bu isimdeki tüm mevcut başlıklar pasife alınacak ve yeniden tanımlanamayacak.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmBan(null)}>
                Vazgeç
              </Button>
              <Button variant="destructive" onClick={() => void handleBanExisting()}>
                Yasakla
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
