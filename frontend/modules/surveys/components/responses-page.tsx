"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Link2,
  Mail,
  MoreHorizontal,
  Phone,
  Play,
  QrCode,
  Search,
  Send,
  Users,
  XCircle,
} from "lucide-react";
import { surveyService, type ResponseSummary, type SurveyResponseRow } from "../services/survey.service";
import type { SurveyRecord } from "../types";

const EMPTY_SUMMARY: ResponseSummary = {
  total: 0,
  completed: 0,
  partial: 0,
  cancelled: 0,
  completedRate: 0,
  partialRate: 0,
  cancelledRate: 0,
};

type Filters = { q: string; surveyId: string; status: string; channel: string; from: string; to: string };

const EMPTY_FILTERS: Filters = { q: "", surveyId: "", status: "", channel: "", from: "", to: "" };

export function SurveyResponsesPage() {
  const [surveys, setSurveys] = useState<SurveyRecord[]>([]);
  const [items, setItems] = useState<SurveyResponseRow[]>([]);
  const [summary, setSummary] = useState<ResponseSummary>(EMPTY_SUMMARY);
  const [total, setTotal] = useState(0);
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [menuId, setMenuId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = (next = applied, nextPage = page, nextLimit = limit) => {
    surveyService.responses({ ...next, page: nextPage, limit: nextLimit })
      .then((result) => {
        setItems(result.items);
        setTotal(result.total);
        setSummary(result.summary);
        setSelected([]);
        setMenuId("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Yanıtlar yüklenemedi"));
  };

  useEffect(() => {
    surveyService.list().then(setSurveys).catch(() => undefined);
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
      const blob = await surveyService.downloadResponses(
        { ...applied, ids: selected.length ? selected.join(",") : undefined },
        format,
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `anket-yanitlari.${format === "xlsx" ? "xlsx" : "csv"}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dışa aktarma başarısız");
    } finally {
      setBusy("");
    }
  };

  const cancel = async (id: string) => {
    setMenuId("");
    if (!window.confirm("Bu yanıt geçersiz sayılsın mı?")) return;
    setError("");
    try {
      await surveyService.cancelResponse(id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yanıt iptal edilemedi");
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Yanıtlar</h1>
          <p className="mt-1 text-sm text-slate-500">Tüm anket yanıtlarını görüntüleyebilir, filtreleyebilir ve detaylarını inceleyebilirsiniz.</p>
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
        <SummaryCard active={false} onClick={() => apply({ ...draft, status: "" })} icon={Users} wrap="bg-blue-50 text-blue-600" label="Toplam Yanıt" value={summary.total} hint={applied.surveyId ? "Seçili anket" : "Tüm anketler"} />
        <SummaryCard active={applied.status === "COMPLETED"} onClick={() => apply({ ...draft, status: "COMPLETED" })} icon={Check} wrap="bg-emerald-50 text-emerald-600" label="Tamamlanan" value={summary.completed} hint={`%${summary.completedRate.toLocaleString("tr-TR")} oranında`} tone="text-emerald-600" />
        <SummaryCard active={applied.status === "STARTED"} onClick={() => apply({ ...draft, status: "STARTED" })} icon={Play} wrap="bg-orange-50 text-orange-500" label="Başlayan" value={summary.partial} hint={`%${summary.partialRate.toLocaleString("tr-TR")} oranında`} tone="text-orange-600" />
        <SummaryCard active={applied.status === "CANCELLED"} onClick={() => apply({ ...draft, status: "CANCELLED" })} icon={XCircle} wrap="bg-rose-50 text-rose-500" label="Geçersiz / İptal" value={summary.cancelled} hint={`%${summary.cancelledRate.toLocaleString("tr-TR")} oranında`} tone="text-rose-600" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={draft.q}
            onChange={(event) => setDraft({ ...draft, q: event.target.value })}
            onKeyDown={(event) => { if (event.key === "Enter") apply(); }}
            placeholder="Ad, soyad veya telefon ile ara..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </label>
        <select value={draft.surveyId} onChange={(event) => setDraft({ ...draft, surveyId: event.target.value })} className={selectClass}>
          <option value="">Tüm anketler</option>
          {surveys.map((survey) => <option key={survey.id} value={survey.id}>{survey.name}</option>)}
        </select>
        <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className={selectClass}>
          <option value="">Tümü</option>
          <option value="SENT">Gönderildi</option>
          <option value="DELIVERED">Teslim edildi</option>
          <option value="OPENED">Açılan</option>
          <option value="STARTED">Başlayan</option>
          <option value="COMPLETED">Tamamlandı</option>
          <option value="FAILED">İletilemedi</option>
          <option value="CANCELLED">Geçersiz / İptal</option>
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
          onClick={() => apply(EMPTY_FILTERS)}
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
                    aria-label="Sayfadaki yanıtları seç"
                  />
                </th>
                {["Ad Soyad", "Telefon", "Anket", "Başlama", "Tamamlanma", "Süre", "Durum", "Yöntem", "İşlemler"].map((label) => (
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
                      aria-label="Yanıtı seç"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{item.anonymous ? "Anonim" : item.name || "—"}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-600">{item.anonymous ? "—" : formatPhone(item.phone)}</td>
                  <td className="px-4 py-3 text-slate-700">{item.surveyName}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{format(item.startedAt)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{format(item.completedAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{item.status === "COMPLETED" && item.durationSeconds != null ? `${Math.max(1, Math.round(item.durationSeconds / 60))} dk` : "—"}</td>
                  <td className="px-4 py-3"><StatusPill status={item.status} /></td>
                  <td className="px-4 py-3"><ChannelPill channel={item.channel} /></td>
                  <td className="px-4 py-3">
                    {item.hasResponse !== false && item.responseId !== null && (
                    <div className="relative flex items-center gap-1">
                      <Link href={`/customer/surveys/responses/${item.responseId || item.id}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700" aria-label="Detay">
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
                        <div className="absolute right-0 top-8 z-10 w-36 rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg" onClick={(event) => event.stopPropagation()}>
                          <Link href={`/customer/surveys/responses/${item.responseId || item.id}`} className="block px-3 py-2 text-slate-700 hover:bg-slate-50">Detayı aç</Link>
                          {item.status !== "CANCELLED" && (
                            <button type="button" onClick={() => cancel(item.responseId || item.id)} className="block w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50">Geçersiz say</button>
                          )}
                        </div>
                      )}
                    </div>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-500">Bu filtrede yanıt yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>Toplam {total.toLocaleString("tr-TR")} yanıt listeleniyor</span>
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
  if (status === "COMPLETED") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600"><Check className="h-3.5 w-3.5" /> Tamamlandı</span>;
  }
  if (status === "STARTED") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-600"><Play className="h-3.5 w-3.5" /> Başlayan</span>;
  }
  if (status === "OPENED") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-600"><Mail className="h-3.5 w-3.5" /> Açılan</span>;
  }
  if (status === "DELIVERED") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600"><Check className="h-3.5 w-3.5" /> Teslim edildi</span>;
  }
  if (status === "SENT") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600"><Send className="h-3.5 w-3.5" /> Gönderildi</span>;
  }
  if (status === "FAILED") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600"><XCircle className="h-3.5 w-3.5" /> İletilemedi</span>;
  }
  if (status === "CANCELLED") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600"><XCircle className="h-3.5 w-3.5" /> Geçersiz</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600"><Clock3 className="h-3.5 w-3.5" /> Yarım Kaldı</span>;
}

function ChannelPill({ channel }: { channel: string }) {
  if (channel === "SMS") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600"><Phone className="h-3.5 w-3.5" /> SMS</span>;
  }
  if (channel === "QR") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600"><QrCode className="h-3.5 w-3.5" /> QR Kod</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-600"><Link2 className="h-3.5 w-3.5" /> Link</span>;
}

function format(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("90") && digits.length >= 12 ? digits.slice(2) : digits.replace(/^0/, "");
  if (local.length !== 10) return value || "—";
  return `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8)}`;
}
