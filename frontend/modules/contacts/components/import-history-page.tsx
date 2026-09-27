"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Clock3,
  FileSpreadsheet,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { contactGroupsService } from "../services/groups.service";
import { contactCustomFieldsService } from "../services/custom-fields.service";
import { contactImportsService } from "../services/imports.service";
import { ExcelImportDialog } from "./excel-import-dialog";
import { BulkNumbersDialog } from "./bulk-numbers-dialog";
import { CompanyImportDialog } from "./company-import-dialog";
import type { ContactCustomFieldRecord, ContactGroupRecord, ContactImportStatus, ContactImportType, ImportJobRecord } from "../types";

type Dialog = "excel" | "bulk" | "company" | null;

const STATUS_META: Record<ContactImportStatus, { label: string; className: string; icon: typeof Check }> = {
  COMPLETED: { label: "Tamamlandı", className: "bg-emerald-50 text-emerald-700", icon: Check },
  PREVIEW: { label: "İşleniyor", className: "bg-amber-50 text-amber-700", icon: Clock3 },
  FAILED: { label: "Hatalı", className: "bg-rose-50 text-rose-700", icon: X },
  CANCELLED: { label: "İptal", className: "bg-slate-100 text-slate-600", icon: X },
};

const KIND_META: Record<ContactImportType, { label: string; className: string; icon: typeof Users }> = {
  EXCEL: { label: "Rehber", className: "bg-blue-50 text-blue-700", icon: Users },
  CSV: { label: "Rehber", className: "bg-blue-50 text-blue-700", icon: Users },
  BULK_NUMBERS: { label: "Toplu Numara", className: "bg-emerald-50 text-emerald-700", icon: Users },
  COMPANY: { label: "Firma", className: "bg-violet-50 text-violet-700", icon: Building2 },
};

export function ImportHistoryPage() {
  const [jobs, setJobs] = useState<ImportJobRecord[]>([]);
  const [groups, setGroups] = useState<ContactGroupRecord[]>([]);
  const [fields, setFields] = useState<ContactCustomFieldRecord[]>([]);
  const [detail, setDetail] = useState<ImportJobRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("ALL");
  const [kind, setKind] = useState("ALL");
  const [menuOpen, setMenuOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [nextJobs, nextGroups, nextFields] = await Promise.all([
        contactImportsService.listJobs(),
        contactGroupsService.list().catch(() => []),
        contactCustomFieldsService.list().catch(() => []),
      ]);
      setJobs(nextJobs);
      setGroups(nextGroups);
      setFields(nextFields);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Geçmiş yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR");
    return jobs.filter((job) => {
      if (q && !job.fileName.toLocaleLowerCase("tr-TR").includes(q)) return false;
      if (status !== "ALL" && job.status !== status) return false;
      if (kind === "BOOK" && job.importType !== "EXCEL" && job.importType !== "CSV") return false;
      if (kind === "BULK" && job.importType !== "BULK_NUMBERS") return false;
      if (kind === "COMPANY" && job.importType !== "COMPANY") return false;
      const created = new Date(job.createdAt);
      if (from && created < new Date(`${from}T00:00:00`)) return false;
      if (to && created > new Date(`${to}T23:59:59`)) return false;
      return true;
    });
  }, [jobs, search, status, kind, from, to]);

  const openDetail = (id: string) => {
    setRowMenu(null);
    void contactImportsService.getJob(id).then(setDetail).catch(() => setDetail(null));
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Aktarım Geçmişi</h1>
          <p className="mt-1 text-sm text-slate-500">Excel, CSV, toplu numara ve firma aktarımları.</p>
        </div>
        <div className="relative">
          <Button className="h-10 rounded-xl bg-blue-600 px-4 text-white hover:bg-blue-700" onClick={() => setMenuOpen((value) => !value)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Yeni Aktarım
            <ChevronDown className="ml-1.5 h-4 w-4" />
          </Button>
          {menuOpen && (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
              <MenuItem label="Excel / CSV" onClick={() => { setMenuOpen(false); setDialog("excel"); }} />
              <MenuItem label="Toplu numara" onClick={() => { setMenuOpen(false); setDialog("bulk"); }} />
              <MenuItem label="Firma kayıtlarından" onClick={() => { setMenuOpen(false); setDialog("company"); }} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[1.2fr_1.3fr_0.7fr_0.7fr_auto]">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Dosya adı</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Dosya adı ile ara..." className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400" />
          </span>
        </label>
        <div>
          <span className="mb-1 block text-xs text-slate-500">Tarih aralığı</span>
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 flex-1 rounded-xl border border-slate-200 px-2 text-sm" />
            <span className="text-slate-300">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 flex-1 rounded-xl border border-slate-200 px-2 text-sm" />
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Durum</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="ALL">Tümü</option>
            <option value="COMPLETED">Tamamlandı</option>
            <option value="PREVIEW">İşleniyor</option>
            <option value="FAILED">Hatalı</option>
            <option value="CANCELLED">İptal</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Tür</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
            <option value="ALL">Tümü</option>
            <option value="BOOK">Rehber</option>
            <option value="BULK">Toplu Numara</option>
            <option value="COMPANY">Firma</option>
          </select>
        </label>
        <div className="flex items-end">
          <button type="button" onClick={() => void load()} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" />
            Yenile
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileSpreadsheet className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Aktarımlar</h2>
              <p className="text-xs text-slate-500">Yapılan tüm Excel, CSV ve toplu aktarımlar bu listede görüntülenir.</p>
            </div>
          </div>
          <p className="text-xs text-slate-400">Toplam {visible.length} kayıt</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-3 py-3 font-medium">Dosya adı</th>
                <th className="px-3 py-3 font-medium">Tür</th>
                <th className="px-3 py-3 font-medium">Aktarım tarihi</th>
                <th className="px-3 py-3 font-medium">Durum</th>
                <th className="px-3 py-3 font-medium">İstatistik</th>
                <th className="px-5 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              )}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                    Aktarım kaydı yok
                  </td>
                </tr>
              )}
              {!loading &&
                visible.map((job, index) => {
                  const statusMeta = STATUS_META[job.status];
                  const kindMeta = KIND_META[job.importType];
                  const StatusIcon = statusMeta.icon;
                  const KindIcon = kindMeta.icon;
                  const created = new Date(job.createdAt);
                  const success = job.successfulRows || job.validRows;
                  return (
                    <tr key={job.id} className="border-t border-slate-100">
                      <td className="px-5 py-3 text-slate-400">{index + 1}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-xs font-bold text-emerald-700">XL</span>
                          <div>
                            <p className="font-medium text-slate-900">{job.fileName || "Adsız aktarım"}</p>
                            <p className="text-xs text-slate-400">{fileKind(job)} · {created.toLocaleString("tr-TR")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${kindMeta.className}`}>
                          <KindIcon className="h-3.5 w-3.5" />
                          {kindMeta.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <p>{created.toLocaleDateString("tr-TR")}</p>
                        <p className="text-xs text-slate-400">{created.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusMeta.className}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        <p className="font-medium text-slate-700">Toplam {job.totalRows}</p>
                        <p>Başarılı {success} · Hatalı {job.failedRows} · Mükerrer {job.duplicateRows}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => openDetail(job.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            Detay
                          </button>
                          <div className="relative">
                            <button type="button" onClick={() => setRowMenu(rowMenu === job.id ? null : job.id)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {rowMenu === job.id && (
                              <div className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
                                <button type="button" className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50" onClick={() => openDetail(job.id)}>
                                  Hata listesi
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>

      {detail && (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">{detail.fileName} hata listesi</h2>
            <button type="button" className="text-sm text-slate-500" onClick={() => setDetail(null)}>Kapat</button>
          </div>
          <div className="max-h-80 overflow-y-auto text-sm">
            {(detail.errors ?? []).map((item, index) => (
              <div key={index} className="border-b border-slate-100 py-2 last:border-0">
                Satır {item.rowNumber ?? "—"} · {item.errorMessage || item.errorType || "Hata"}
              </div>
            ))}
            {!detail.errors?.length && <p className="text-slate-400">Hata yok</p>}
          </div>
        </section>
      )}

      {dialog === "excel" && (
        <ExcelImportDialog groups={groups} customFields={fields} onClose={() => setDialog(null)} onDone={() => { setDialog(null); void load(); }} />
      )}
      {dialog === "bulk" && <BulkNumbersDialog groups={groups} onClose={() => setDialog(null)} onDone={() => { setDialog(null); void load(); }} />}
      {dialog === "company" && <CompanyImportDialog groups={groups} onClose={() => setDialog(null)} onDone={() => { setDialog(null); void load(); }} />}
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50">
      {label}
    </button>
  );
}

function fileKind(job: ImportJobRecord) {
  const name = job.fileName.toLowerCase();
  if (name.endsWith(".csv") || job.importType === "CSV") return "CSV";
  if (job.importType === "BULK_NUMBERS") return "Toplu numara";
  if (job.importType === "COMPANY") return "Firma";
  return "Excel";
}
