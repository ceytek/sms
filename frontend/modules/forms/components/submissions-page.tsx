"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Inbox,
  Link2,
  MoreHorizontal,
  Phone,
  QrCode,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import { formService } from "../services/form.service";
import { SUBMISSION_STATUS_LABELS, type FormRecord, type SubmissionRecord, type SubmissionStatus, type SubmissionSummary } from "../types";

const EMPTY_SUMMARY: SubmissionSummary = {
  total: 0,
  fresh: 0,
  inReview: 0,
  approved: 0,
  freshRate: 0,
  inReviewRate: 0,
  approvedRate: 0,
};

type Filters = { q: string; formId: string; status: string; channel: string; from: string; to: string };

export function FormSubmissionsPage() {
  const searchParams = useSearchParams();
  const initial: Filters = { q: "", formId: searchParams.get("formId") ?? "", status: "", channel: "", from: "", to: "" };
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [items, setItems] = useState<SubmissionRecord[]>([]);
  const [summary, setSummary] = useState<SubmissionSummary>(EMPTY_SUMMARY);
  const [total, setTotal] = useState(0);
  const [draft, setDraft] = useState<Filters>(initial);
  const [applied, setApplied] = useState<Filters>(initial);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [menuId, setMenuId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = (next = applied, nextPage = page, nextLimit = limit) => {
    const params: Record<string, string> = { page: String(nextPage), limit: String(nextLimit) };
    if (next.q) params.q = next.q;
    if (next.formId) params.formId = next.formId;
    if (next.status) params.status = next.status;
    if (next.channel) params.channel = next.channel;
    if (next.from) params.from = next.from;
    if (next.to) params.to = next.to;
    formService.submissions(params)
      .then((result) => {
        setItems(result.items);
        setTotal(result.total ?? result.meta.total);
        setSummary(result.summary ?? EMPTY_SUMMARY);
        setSelected([]);
        setMenuId("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Başvurular yüklenemedi"));
  };

  useEffect(() => {
    formService.list().then(setForms).catch(() => undefined);
  }, []);

  useEffect(() => {
    load(applied, page, limit);
  }, [applied, page, limit]);

  const apply = (next: Filters = draft) => {
    setDraft(next);
    setApplied(next);
    setPage(1);
  };

  const download = async (format: "csv" | "xlsx") => {
    setError("");
    setBusy(format);
    try {
      const params: Record<string, string> = { format };
      if (applied.q) params.q = applied.q;
      if (applied.formId) params.formId = applied.formId;
      if (applied.status) params.status = applied.status;
      if (applied.channel) params.channel = applied.channel;
      if (applied.from) params.from = applied.from;
      if (applied.to) params.to = applied.to;
      if (selected.length) params.ids = selected.join(",");
      const blob = await formService.exportSubmissions(params);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `form-basvurulari.${format === "xlsx" ? "xlsx" : "csv"}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dışa aktarma başarısız");
    } finally {
      setBusy("");
    }
  };

  const setStatus = async (id: string, status: SubmissionStatus) => {
    setMenuId("");
    setError("");
    try {
      await formService.updateSubmissionStatus(id, status);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Durum güncellenemedi");
    }
  };

  const pages = Math.max(1, Math.ceil(total / limit));
  const pageWindow = Array.from({ length: Math.min(5, pages) }, (_, index) => {
    const start = Math.min(Math.max(1, page - 2), Math.max(1, pages - 4));
    return start + index;
  });
  const allChecked = items.length > 0 && items.every((item) => selected.includes(item.id));

  return (
    <div className="mx-auto max-w-7xl px-6 py-8" onClick={() => setMenuId("")}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Başvurular</h1>
          <p className="mt-1 text-sm text-slate-500">Tüm form başvurularını görüntüleyebilir, filtreleyebilir ve durumlarını yönetebilirsiniz.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => download("xlsx")} disabled={busy === "xlsx"} className={ghostBtn}>
            <FileSpreadsheet className="h-4 w-4" /> Excel&apos;e Aktar
          </button>
          <button type="button" onClick={() => download("csv")} disabled={busy === "csv"} className={ghostBtn}>
            <FileText className="h-4 w-4" /> CSV
          </button>
          <button type="button" onClick={() => apply()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
            <Filter className="h-4 w-4" /> Filtrele
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard active={!applied.status} onClick={() => apply({ ...draft, status: "" })} icon={Users} wrap="bg-blue-50 text-blue-600" label="Toplam Başvuru" value={summary.total} hint={applied.formId ? "Seçili form" : "Tüm formlar"} />
        <SummaryCard active={applied.status === "NEW"} onClick={() => apply({ ...draft, status: "NEW" })} icon={Inbox} wrap="bg-sky-50 text-sky-600" label="Yeni" value={summary.fresh} hint={`%${summary.freshRate.toLocaleString("tr-TR")} oranında`} tone="text-sky-600" />
        <SummaryCard active={applied.status === "IN_REVIEW"} onClick={() => apply({ ...draft, status: "IN_REVIEW" })} icon={Clock3} wrap="bg-orange-50 text-orange-500" label="İnceleniyor" value={summary.inReview} hint={`%${summary.inReviewRate.toLocaleString("tr-TR")} oranında`} tone="text-orange-600" />
        <SummaryCard active={applied.status === "APPROVED"} onClick={() => apply({ ...draft, status: "APPROVED" })} icon={Check} wrap="bg-emerald-50 text-emerald-600" label="Onaylanan" value={summary.approved} hint={`%${summary.approvedRate.toLocaleString("tr-TR")} oranında`} tone="text-emerald-600" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={draft.q}
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
            onKeyDown={(event) => { if (event.key === "Enter") apply(); }}
            placeholder="Ad, telefon veya form yanıtı ile ara..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </label>
        <select value={draft.formId} onChange={(event) => setDraft({ ...draft, formId: event.target.value })} className={selectClass}>
          <option value="">Tüm formlar</option>
          {forms.map((form) => <option key={form.id} value={form.id}>{form.name}</option>)}
        </select>
        <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className={selectClass}>
          <option value="">Tümü</option>
          {(Object.keys(SUBMISSION_STATUS_LABELS) as SubmissionStatus[]).map((status) => (
            <option key={status} value={status}>{SUBMISSION_STATUS_LABELS[status]}</option>
          ))}
        </select>
        <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500">
          <input type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} className="bg-transparent outline-none" aria-label="Başlangıç tarihi" />
          <span>→</span>
          <input type="date" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} className="bg-transparent outline-none" aria-label="Bitiş tarihi" />
        </div>
        <select value={draft.channel} onChange={(event) => setDraft({ ...draft, channel: event.target.value })} className={selectClass}>
          <option value="">Tüm yöntemler</option>
          <option value="SMS">SMS</option>
          <option value="QR">QR Kod</option>
          <option value="PUBLIC">Link</option>
        </select>
        <button
          type="button"
          onClick={() => apply({ q: "", formId: "", status: "", channel: "", from: "", to: "" })}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600"
        >
          <Filter className="h-4 w-4" /> Filtreleri Temizle
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={() => setSelected(allChecked ? [] : items.map((item) => item.id))}
                    aria-label="Sayfadaki başvuruları seç"
                  />
                </th>
                {["Ad Soyad", "Telefon", "Form", "Başvuru", "Tamamlanma", "Süre", "Durum", "Yöntem", "İşlemler"].map((label) => (
                  <th key={label} className="px-4 py-3 font-medium">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => setSelected((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}
                      aria-label="Başvuruyu seç"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{item.name || "—"}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{formatPhone(item.phone || "")}</td>
                  <td className="px-4 py-3 text-slate-700">{item.formName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format(item.startedAt || item.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{format(item.completedAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{item.durationSeconds != null ? `${Math.max(1, Math.round(item.durationSeconds / 60))} dk` : "—"}</td>
                  <td className="px-4 py-3"><StatusPill status={item.status} /></td>
                  <td className="px-4 py-3"><ChannelPill channel={item.channel} /></td>
                  <td className="px-4 py-3">
                    <div className="relative flex items-center gap-1">
                      <Link href={`/customer/forms/submissions/${item.id}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700" aria-label="Detay">
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                        aria-label="İşlemler"
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuId(menuId === item.id ? "" : item.id);
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {menuId === item.id && (
                        <div className="absolute right-0 top-8 z-10 w-40 rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg" onClick={(event) => event.stopPropagation()}>
                          <Link href={`/customer/forms/submissions/${item.id}`} className="block px-3 py-2 text-slate-700 hover:bg-slate-50">Detayı aç</Link>
                          {item.status !== "IN_REVIEW" && (
                            <button type="button" onClick={() => setStatus(item.id, "IN_REVIEW")} className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50">İncelemeye al</button>
                          )}
                          {item.status !== "APPROVED" && (
                            <button type="button" onClick={() => setStatus(item.id, "APPROVED")} className="flex w-full items-center gap-2 px-3 py-2 text-left text-emerald-700 hover:bg-emerald-50">
                              <Check className="h-3.5 w-3.5" /> Onayla
                            </button>
                          )}
                          {item.status !== "REJECTED" && (
                            <button type="button" onClick={() => setStatus(item.id, "REJECTED")} className="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50">
                              <XCircle className="h-3.5 w-3.5" /> Reddet
                            </button>
                          )}
                          {item.status !== "ARCHIVED" && (
                            <button type="button" onClick={() => setStatus(item.id, "ARCHIVED")} className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-600 hover:bg-slate-50">
                              <Archive className="h-3.5 w-3.5" /> Arşivle
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-500">Bu filtrede başvuru yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>Toplam {total.toLocaleString("tr-TR")} başvuru listeleniyor</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40" aria-label="Önceki sayfa">
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageWindow.map((number) => (
              <button key={number} type="button" onClick={() => setPage(number)} className={`h-8 min-w-8 rounded-lg px-2 ${number === page ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                {number}
              </button>
            ))}
            <button type="button" disabled={page >= pages} onClick={() => setPage((current) => Math.min(pages, current + 1))} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40" aria-label="Sonraki sayfa">
              <ChevronRight className="h-4 w-4" />
            </button>
            <select
              value={limit}
              onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}
              className="ml-2 h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm"
              aria-label="Sayfa başına kayıt"
            >
              {[10, 25, 50].map((size) => <option key={size} value={size}>{size} / sayfa</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

const ghostBtn = "inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60";
const selectClass = "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none";

function SummaryCard({
  icon: Icon,
  wrap,
  label,
  value,
  hint,
  tone = "text-slate-900",
  active,
  onClick,
}: {
  icon: typeof Users;
  wrap: string;
  label: string;
  value: number;
  hint: string;
  tone?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border bg-white px-4 py-4 text-left shadow-sm ${active ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200"}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${wrap}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className={`text-2xl font-semibold leading-tight ${tone}`}>{value.toLocaleString("tr-TR")}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-400">{hint}</p>
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  if (status === "NEW") return <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-600"><Inbox className="h-3.5 w-3.5" /> Yeni</span>;
  if (status === "IN_REVIEW") return <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600"><Clock3 className="h-3.5 w-3.5" /> İnceleniyor</span>;
  if (status === "COMPLETED") return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600"><Check className="h-3.5 w-3.5" /> Tamamlandı</span>;
  if (status === "APPROVED") return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600"><Check className="h-3.5 w-3.5" /> Onaylandı</span>;
  if (status === "REJECTED") return <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600"><XCircle className="h-3.5 w-3.5" /> Reddedildi</span>;
  if (status === "ARCHIVED") return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500"><Archive className="h-3.5 w-3.5" /> Arşiv</span>;
  return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">{SUBMISSION_STATUS_LABELS[status as SubmissionStatus] ?? status}</span>;
}

function ChannelPill({ channel }: { channel: string }) {
  if (channel === "SMS") return <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600"><Phone className="h-3.5 w-3.5" /> SMS</span>;
  if (channel === "QR") return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600"><QrCode className="h-3.5 w-3.5" /> QR Kod</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-600"><Link2 className="h-3.5 w-3.5" /> Link</span>;
}

function format(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "—";
  const local = digits.startsWith("90") && digits.length >= 12 ? digits.slice(2) : digits.replace(/^0/, "");
  if (local.length !== 10) return value;
  return `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8)}`;
}
