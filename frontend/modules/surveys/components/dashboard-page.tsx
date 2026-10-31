"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  CalendarRange,
  Copy,
  FileText,
  MoreHorizontal,
  Percent,
  Play,
  Plus,
  Search,
  Send,
  Users,
} from "lucide-react";
import { surveyService } from "../services/survey.service";
import { SURVEY_STATUS_LABELS, type SurveyRecord, type SurveyStatus } from "../types";

type SortKey = "name" | "status" | "sent" | "completed" | "responseRate" | "startsAt" | "endsAt";

export function SurveyDashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState({ total: 0, active: 0, sent: 0, responses: 0, responseRate: 0, incomplete: 0 });
  const [rows, setRows] = useState<SurveyRecord[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SurveyStatus | "">("");
  const [range, setRange] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const [menuId, setMenuId] = useState("");

  useEffect(() => {
    surveyService.dashboard().then((data) => {
      setSummary({
        total: data.total,
        active: data.active,
        sent: data.sent,
        responses: data.responses,
        responseRate: data.responseRate,
        incomplete: data.incomplete,
      });
    }).catch((err) => setError(err instanceof Error ? err.message : "Özet yüklenemedi"));
    surveyService.list().then(setRows).catch((err) => setError(err instanceof Error ? err.message : "Anketler yüklenemedi"));
  }, []);

  const visible = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const last30 = new Date(now);
    last30.setDate(now.getDate() - 30);
    const filtered = rows.filter((row) => {
      if (query && !row.name.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR"))) return false;
      if (status && row.status !== status) return false;
      if (range === "month" && !inRange(row.startsAt, monthStart, now) && !inRange(row.endsAt, monthStart, now)) return false;
      if (range === "last30" && !inRange(row.startsAt, last30, now) && !inRange(row.endsAt, last30, now)) return false;
      return true;
    });
    if (!sort) return filtered;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => compare(a, b, sort.key) * dir);
  }, [rows, query, status, range, sort]);

  const toggleSort = (key: SortKey) => {
    setSort((current) => {
      if (current?.key !== key) return { key, dir: "asc" };
      if (current.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const copy = (id: string) => {
    setMenuId("");
    surveyService.copy(id)
      .then((created) => router.push(`/customer/surveys/${created.id}`))
      .catch((err) => setError(err instanceof Error ? err.message : "Kopyalanamadı"));
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8" onClick={() => setMenuId("")}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Anketler</h1>
          <p className="mt-1 text-sm text-slate-500">Gönderim, yanıt ve tamamlanma özeti.</p>
        </div>
        <Link href="/customer/surveys/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Yeni anket
        </Link>
      </div>

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Stat icon={FileText} wrap="bg-blue-50 text-blue-600" spark="text-blue-400" label="Toplam Anket" value={summary.total.toLocaleString("tr-TR")} />
        <Stat icon={Play} wrap="bg-emerald-50 text-emerald-600" spark="text-emerald-400" label="Aktif Anket" value={summary.active.toLocaleString("tr-TR")} />
        <Stat icon={Send} wrap="bg-violet-50 text-violet-600" spark="text-violet-400" label="Toplam Gönderim" value={summary.sent.toLocaleString("tr-TR")} />
        <Stat icon={Users} wrap="bg-orange-50 text-orange-500" spark="text-orange-300" label="Toplam Yanıt" value={summary.responses.toLocaleString("tr-TR")} />
        <Stat icon={Percent} wrap="bg-sky-50 text-sky-600" spark="text-sky-400" label="Yanıt Oranı" value={`%${summary.responseRate.toLocaleString("tr-TR")}`} />
        <Stat icon={FileText} wrap="bg-rose-50 text-rose-500" spark="text-rose-300" label="Tamamlanmayan" value={summary.incomplete.toLocaleString("tr-TR")} />
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-semibold text-slate-900">Anket Listesi</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Anket ara..." className="h-9 w-44 rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400" />
            </label>
            <select value={status} onChange={(event) => setStatus(event.target.value as SurveyStatus | "")} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
              <option value="">Tüm durumlar</option>
              {(Object.keys(SURVEY_STATUS_LABELS) as SurveyStatus[]).map((item) => (
                <option key={item} value={item}>{SURVEY_STATUS_LABELS[item]}</option>
              ))}
            </select>
            <label className="relative">
              <CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select value={range} onChange={(event) => setRange(event.target.value)} className="h-9 appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-700">
                <option value="">Tarih</option>
                <option value="month">Bu ay</option>
                <option value="last30">Son 30 gün</option>
              </select>
            </label>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <SortHead label="Anket" sortKey="name" sort={sort} onSort={toggleSort} />
                <SortHead label="Durum" sortKey="status" sort={sort} onSort={toggleSort} />
                <SortHead label="Gönderilen" sortKey="sent" sort={sort} onSort={toggleSort} />
                <SortHead label="Yanıt" sortKey="completed" sort={sort} onSort={toggleSort} />
                <SortHead label="Yanıt Oranı" sortKey="responseRate" sort={sort} onSort={toggleSort} />
                <SortHead label="Başlangıç" sortKey="startsAt" sort={sort} onSort={toggleSort} />
                <SortHead label="Bitiş" sortKey="endsAt" sort={sort} onSort={toggleSort} />
                <th className="px-4 py-3 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <FileText className="h-4 w-4" />
                      </span>
                      <span className="font-medium text-slate-900">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{row.sent.toLocaleString("tr-TR")}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{row.completed.toLocaleString("tr-TR")}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">%{row.responseRate.toLocaleString("tr-TR")}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(row.startsAt)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(row.endsAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/customer/surveys/${row.id}`} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                        Aç <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <div className="relative">
                        <button
                          type="button"
                          aria-label="Diğer işlemler"
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuId(menuId === row.id ? "" : row.id);
                          }}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-50"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuId === row.id && (
                          <div className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg" onClick={(event) => event.stopPropagation()}>
                            <Link href={`/customer/surveys/${row.id}/results`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50">
                              <BarChart3 className="h-3.5 w-3.5" /> Sonuç
                            </Link>
                            <button type="button" onClick={() => copy(row.id)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50">
                              <Copy className="h-3.5 w-3.5" /> Kopyala
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Bu filtrede anket yok.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, wrap, spark, label, value }: { icon: typeof FileText; wrap: string; spark: string; label: string; value: string }) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${wrap}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-semibold leading-tight text-slate-900">{value}</p>
        </div>
      </div>
      <Spark className={spark} />
    </article>
  );
}

function Spark({ className }: { className: string }) {
  const heights = [8, 14, 10, 18, 12, 20, 15];
  return (
    <svg viewBox="0 0 56 24" className={`h-8 w-16 ${className}`} aria-hidden>
      {heights.map((height, index) => (
        <rect key={index} x={index * 8} y={24 - height} width="4" height={height} rx="1.5" fill="currentColor" opacity={0.45 + index * 0.07} />
      ))}
    </svg>
  );
}

function SortHead({ label, sortKey, sort, onSort }: { label: string; sortKey: SortKey; sort: { key: SortKey; dir: "asc" | "desc" } | null; onSort: (key: SortKey) => void }) {
  const active = sort?.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className="px-4 py-3 font-medium">
      <button type="button" onClick={() => onSort(sortKey)} className="inline-flex items-center gap-1 hover:text-slate-800">
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </th>
  );
}

export function StatusBadge({ status }: { status: SurveyStatus }) {
  const tone =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-600"
      : status === "COMPLETED"
        ? "bg-sky-50 text-sky-700"
        : status === "CANCELLED" || status === "EXPIRED"
          ? "bg-slate-100 text-slate-500"
          : "bg-amber-50 text-amber-600";
  const dot =
    status === "ACTIVE"
      ? "bg-emerald-500"
      : status === "COMPLETED"
        ? "bg-sky-500"
        : status === "CANCELLED" || status === "EXPIRED"
          ? "bg-slate-400"
          : "bg-amber-500";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {SURVEY_STATUS_LABELS[status]}
    </span>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("tr-TR");
}

function inRange(value: string | null, from: Date, to: Date) {
  if (!value) return false;
  const date = new Date(value);
  return date >= from && date <= to;
}

function compare(a: SurveyRecord, b: SurveyRecord, key: SortKey) {
  if (key === "name") return a.name.localeCompare(b.name, "tr");
  if (key === "status") return a.status.localeCompare(b.status);
  if (key === "sent" || key === "completed" || key === "responseRate") return a[key] - b[key];
  return (a[key] || "").localeCompare(b[key] || "");
}
