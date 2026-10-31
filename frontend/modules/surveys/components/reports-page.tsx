"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarRange,
  Clock3,
  FileText,
  Filter,
  MessageCircle,
  MoreHorizontal,
  PieChart,
  Play,
  Plus,
  Search,
  Send,
  Star,
  Users,
} from "lucide-react";
import { surveyService } from "../services/survey.service";
import { SURVEY_STATUS_LABELS, type SurveyRecord, type SurveyStatus } from "../types";

const PAGE_SIZE = 6;

const ROW_ICONS = [
  { icon: FileText, wrap: "bg-blue-50 text-blue-600" },
  { icon: Users, wrap: "bg-emerald-50 text-emerald-600" },
  { icon: Star, wrap: "bg-violet-50 text-violet-600" },
  { icon: CalendarRange, wrap: "bg-orange-50 text-orange-600" },
  { icon: MessageCircle, wrap: "bg-pink-50 text-pink-600" },
  { icon: BarChart3, wrap: "bg-teal-50 text-teal-600" },
];

export function SurveyReportsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SurveyRecord[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, sent: 0, responses: 0, responseRate: 0, incomplete: 0 });
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SurveyStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ query: "", status: "" as SurveyStatus | "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [menuId, setMenuId] = useState("");

  useEffect(() => {
    surveyService.list().then(setRows).catch((err) => setError(err instanceof Error ? err.message : "Raporlar yüklenemedi"));
    surveyService.dashboard().then((data) => {
      setSummary({
        total: data.total,
        active: data.active,
        sent: data.sent,
        responses: data.responses,
        responseRate: data.responseRate,
        incomplete: data.incomplete,
      });
    }).catch(() => undefined);
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (applied.query && !row.name.toLocaleLowerCase("tr-TR").includes(applied.query.toLocaleLowerCase("tr-TR"))) return false;
      if (applied.status && row.status !== applied.status) return false;
      if (applied.from && row.endsAt && row.endsAt.slice(0, 10) < applied.from) return false;
      if (applied.to && row.startsAt && row.startsAt.slice(0, 10) > applied.to) return false;
      return true;
    });
  }, [rows, applied]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const download = async (id: string, format: "csv" | "xlsx") => {
    const blob = await surveyService.download(id, format);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `anket.${format}`;
    link.click();
    URL.revokeObjectURL(url);
    setMenuId("");
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8" onClick={() => setMenuId("")}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Raporlar</h1>
          <p className="mt-1 text-sm text-slate-500">Tüm anketlerinizin sonuçlarını görüntüleyebilir, analiz edebilir ve dışa aktarabilirsiniz.</p>
        </div>
        <Link href="/customer/surveys/new" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm">
          <Plus className="h-4 w-4" />
          Yeni Anket Oluştur
        </Link>
      </div>

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={<FileText className="h-4 w-4" />} tone="bg-blue-50 text-blue-600" label="Toplam Anket" value={summary.total.toLocaleString("tr-TR")} hint="Tüm dönem" />
        <StatCard icon={<Play className="h-4 w-4" />} tone="bg-emerald-50 text-emerald-600" label="Aktif Anket" value={summary.active.toLocaleString("tr-TR")} hint="Devam ediyor" />
        <StatCard icon={<Send className="h-4 w-4" />} tone="bg-violet-50 text-violet-600" label="Toplam Gönderim" value={summary.sent.toLocaleString("tr-TR")} hint="Tüm anketler" />
        <StatCard icon={<Users className="h-4 w-4" />} tone="bg-sky-50 text-sky-600" label="Toplam Yanıt" value={summary.responses.toLocaleString("tr-TR")} hint="Tüm anketler" />
        <StatCard icon={<PieChart className="h-4 w-4" />} tone="bg-amber-50 text-amber-600" label="Yanıt Oranı" value={`%${summary.responseRate.toLocaleString("tr-TR")}`} hint="Ortalama oran" />
        <StatCard icon={<Clock3 className="h-4 w-4" />} tone="bg-rose-50 text-rose-600" label="Tamamlanmayan" value={summary.incomplete.toLocaleString("tr-TR")} hint="Yarım kalan yanıt" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Anket adı ile ara..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as SurveyStatus | "")}
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
        >
          <option value="">Tüm Durumlar</option>
          {(Object.keys(SURVEY_STATUS_LABELS) as SurveyStatus[]).map((item) => (
            <option key={item} value={item}>{SURVEY_STATUS_LABELS[item]}</option>
          ))}
        </select>
        <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500">
          <CalendarRange className="h-4 w-4 text-slate-400" />
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="bg-transparent outline-none" />
          <span>→</span>
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="bg-transparent outline-none" />
        </div>
        <button
          type="button"
          onClick={() => {
            setApplied({ query: query.trim(), status, from, to });
            setPage(1);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
        >
          <Filter className="h-4 w-4" />
          Filtrele
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                {["Anket", "Gönderilen", "Yanıt", "Oran", "Durum", "Başlangıç", "Bitiş", "İşlemler"].map((label) => (
                  <th key={label} className="px-4 py-3 font-medium">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, index) => {
                const visual = ROW_ICONS[((page - 1) * PAGE_SIZE + index) % ROW_ICONS.length];
                const Icon = visual.icon;
                const subtitle = row.description || (row.formTitle && row.formTitle !== row.name ? row.formTitle : "");
                return (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${visual.wrap}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block font-medium text-slate-900">{row.name}</span>
                          {subtitle && <span className="block max-w-[240px] truncate text-xs text-slate-400">{subtitle}</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{row.sent.toLocaleString("tr-TR")}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{row.completed.toLocaleString("tr-TR")}</td>
                    <td className="px-4 py-3">
                      <div className="w-24">
                        <div className="mb-1 text-xs font-medium text-slate-700">%{row.responseRate.toLocaleString("tr-TR")}</div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className={`h-full rounded-full ${rateTone(row.responseRate)}`} style={{ width: `${Math.min(100, row.responseRate)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><ReportStatus status={row.status} /></td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(row.startsAt)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(row.endsAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/customer/surveys/${row.id}/results`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          <BarChart3 className="h-3.5 w-3.5" />
                          Sonuç
                        </Link>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setMenuId(menuId === row.id ? "" : row.id);
                            }}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {menuId === row.id && (
                            <div className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-lg" onClick={(event) => event.stopPropagation()}>
                              <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => router.push(`/customer/surveys/${row.id}`)}>Düzenle</button>
                              <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => download(row.id, "csv")}>CSV indir</button>
                              <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => download(row.id, "xlsx")}>Excel indir</button>
                              <button className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => surveyService.copy(row.id).then((copy) => router.push(`/customer/surveys/${copy.id}`)).catch((err) => setError(err.message))}>Kopyala</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Bu filtrede anket yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <span>Toplam {filtered.length.toLocaleString("tr-TR")} anket listeleniyor</span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="h-8 w-8 rounded-lg border border-slate-200 disabled:opacity-40">‹</button>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-blue-600 px-2 font-medium text-white">{page}</span>
            <button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="h-8 w-8 rounded-lg border border-slate-200 disabled:opacity-40">›</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, tone, label, value, hint }: { icon: React.ReactNode; tone: string; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
      </div>
      <p className="mt-3 text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
    </div>
  );
}

function ReportStatus({ status }: { status: SurveyStatus }) {
  const tone =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700"
      : status === "COMPLETED"
        ? "bg-sky-50 text-sky-700"
        : status === "CANCELLED" || status === "EXPIRED"
          ? "bg-slate-100 text-slate-600"
          : "bg-amber-50 text-amber-700";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{SURVEY_STATUS_LABELS[status]}</span>;
}

function rateTone(rate: number) {
  if (rate >= 60) return "bg-emerald-500";
  if (rate >= 40) return "bg-blue-500";
  return "bg-orange-400";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("tr-TR");
}
