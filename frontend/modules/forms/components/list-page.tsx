"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  BarChart3,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Copy,
  FileSpreadsheet,
  FileText,
  Filter,
  Inbox,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { formService } from "../services/form.service";
import { FORM_STATUS_LABELS, type FormRecord, type FormStatus } from "../types";

const ROW_ICONS = [
  { icon: FileText, wrap: "bg-blue-100 text-blue-600" },
  { icon: Users, wrap: "bg-emerald-100 text-emerald-600" },
  { icon: ClipboardList, wrap: "bg-violet-100 text-violet-600" },
  { icon: Inbox, wrap: "bg-orange-100 text-orange-500" },
  { icon: BarChart3, wrap: "bg-pink-100 text-pink-500" },
  { icon: FileSpreadsheet, wrap: "bg-teal-100 text-teal-600" },
];

export function FormListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<FormRecord[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, submissions: 0, drafts: 0, today: 0, thisMonth: 0, incomplete: 0 });
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FormStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ query: "", status: "" as FormStatus | "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [menuId, setMenuId] = useState("");
  const [busy, setBusy] = useState("");

  const load = () => {
    formService.list().then(setRows).catch((err) => setError(err instanceof Error ? err.message : "Formlar yüklenemedi"));
    formService.dashboard().then(setSummary).catch(() => undefined);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (applied.query && !row.name.toLocaleLowerCase("tr-TR").includes(applied.query.toLocaleLowerCase("tr-TR"))) return false;
      if (applied.status && row.status !== applied.status) return false;
      if (applied.from && row.endsAt && row.endsAt.slice(0, 10) < applied.from) return false;
      if (applied.to && row.startsAt && row.startsAt.slice(0, 10) > applied.to) return false;
      return true;
    });
  }, [rows, applied]);

  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * limit, safePage * limit);

  const copy = (id: string) => {
    setMenuId("");
    setBusy(id);
    formService.copy(id)
      .then((created) => router.push(`/customer/forms/${created.id}`))
      .catch((err) => setError(err instanceof Error ? err.message : "Kopyalanamadı"))
      .finally(() => setBusy(""));
  };

  const toggle = (id: string, current: FormStatus) => {
    setMenuId("");
    const next = current === "ACTIVE" ? "PASSIVE" : "ACTIVE";
    formService.setStatus(id, next).then(load).catch((err) => setError(err instanceof Error ? err.message : "Durum güncellenemedi"));
  };

  const archive = (id: string) => {
    setMenuId("");
    formService.setStatus(id, "ARCHIVED").then(load).catch((err) => setError(err instanceof Error ? err.message : "Arşivlenemedi"));
  };

  const download = async (id: string, format: "csv" | "xlsx") => {
    setMenuId("");
    setBusy(id + format);
    try {
      const blob = await formService.exportSubmissions({ formId: id, format });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `basvurular.${format === "xlsx" ? "xlsx" : "csv"}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dışa aktarma başarısız");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8" onClick={() => setMenuId("")}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Formlar</h1>
          <p className="mt-1 text-sm text-slate-500">Oluşturduğunuz tüm formları görüntüleyebilir, düzenleyebilir ve başvurularını takip edebilirsiniz.</p>
        </div>
        <Link href="/customer/forms/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Yeni Form Oluştur
        </Link>
      </div>

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Stat icon={FileText} card="bg-blue-50" iconTone="bg-white text-blue-600" label="Toplam Form" value={summary.total.toLocaleString("tr-TR")} hint="Tüm formlar" />
        <Stat icon={Play} card="bg-emerald-50" iconTone="bg-white text-emerald-600" label="Aktif Form" value={summary.active.toLocaleString("tr-TR")} hint="Devam ediyor" />
        <Stat icon={ClipboardList} card="bg-violet-50" iconTone="bg-white text-violet-600" label="Taslak" value={summary.drafts.toLocaleString("tr-TR")} hint="Henüz yayınlanmamış" />
        <Stat icon={Users} card="bg-sky-50" iconTone="bg-white text-sky-600" label="Toplam Başvuru" value={summary.submissions.toLocaleString("tr-TR")} hint="Tüm formlar" />
        <Stat icon={Inbox} card="bg-amber-50" iconTone="bg-white text-amber-500" label="Bu Ay" value={summary.thisMonth.toLocaleString("tr-TR")} hint="Aylık başvuru" />
        <Stat icon={Clock3} card="bg-rose-50" iconTone="bg-white text-rose-500" label="Yeni Başvuru" value={summary.incomplete.toLocaleString("tr-TR")} hint="Henüz incelenmemiş" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setApplied({ query: query.trim(), status, from, to });
                setPage(1);
              }
            }}
            placeholder="Form adı ile ara..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value as FormStatus | "")} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
          <option value="">Tüm durumlar</option>
          {(Object.keys(FORM_STATUS_LABELS) as FormStatus[]).map((item) => (
            <option key={item} value={item}>{FORM_STATUS_LABELS[item]}</option>
          ))}
        </select>
        <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500">
          <CalendarRange className="h-4 w-4 text-slate-400" />
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="bg-transparent outline-none" aria-label="Başlangıç" />
          <span>→</span>
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="bg-transparent outline-none" aria-label="Bitiş" />
        </div>
        <button
          type="button"
          onClick={() => {
            setApplied({ query: query.trim(), status, from, to });
            setPage(1);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
        >
          <Filter className="h-4 w-4" /> Filtrele
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-slate-50/80 text-left text-xs text-slate-500">
            <tr>
              <th className="w-[22%] px-3 py-3 font-medium">Form</th>
              <th className="w-[10%] px-3 py-3 font-medium">Durum</th>
              <th className="w-[8%] px-3 py-3 font-medium">Başvuru</th>
              <th className="w-[9%] px-3 py-3 font-medium">Doluluk</th>
              <th className="w-[10%] px-3 py-3 font-medium">Başlangıç</th>
              <th className="w-[10%] px-3 py-3 font-medium">Bitiş</th>
              <th className="px-3 py-3 text-right font-medium">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => {
              const visual = ROW_ICONS[((safePage - 1) * limit + index) % ROW_ICONS.length];
              const Icon = visual.icon;
              const subtitle = row.description || (row.title && row.title !== row.name ? row.title : "");
              const fill = row.maxSubmissions ? Math.min(100, Math.round((row.submissions / row.maxSubmissions) * 100)) : null;
              return (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${visual.wrap}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-900">{row.name}</span>
                        {subtitle && <span className="block truncate text-xs text-slate-400">{subtitle}</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3"><StatusPill status={row.status} /></td>
                  <td className="px-3 py-3 tabular-nums text-slate-700">{row.submissions.toLocaleString("tr-TR")}</td>
                  <td className="px-3 py-3">
                    <div className="w-16">
                      <div className="text-xs font-medium text-slate-600">{fill === null ? "—" : `%${fill.toLocaleString("tr-TR")}`}</div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full ${rateTone(fill ?? 0)}`} style={{ width: `${fill ?? 0}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(row.startsAt)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(row.endsAt)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Link href={`/customer/forms/${row.id}`} className={actionBtn}>
                        <Pencil className="h-3.5 w-3.5" /> Düzenle
                      </Link>
                      <Link href={`/customer/forms/submissions?formId=${row.id}`} className={actionBtn}>
                        <BarChart3 className="h-3.5 w-3.5" /> Başvuru
                      </Link>
                      <button type="button" disabled={busy === row.id} onClick={() => copy(row.id)} className={actionBtn}>
                        <Copy className="h-3.5 w-3.5" /> Kopyala
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          aria-label="Diğer işlemler"
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenuId(menuId === row.id ? "" : row.id);
                          }}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {menuId === row.id && (
                          <div className="absolute right-0 z-10 mt-1 w-40 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-lg" onClick={(event) => event.stopPropagation()}>
                            {(row.status === "ACTIVE" || row.status === "PASSIVE") && (
                              <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => toggle(row.id, row.status)}>
                                {row.status === "ACTIVE" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                {row.status === "ACTIVE" ? "Pasif yap" : "Aktif yap"}
                              </button>
                            )}
                            {row.status !== "ARCHIVED" && (
                              <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50" onClick={() => archive(row.id)}>
                                <Archive className="h-3.5 w-3.5" /> Arşivle
                              </button>
                            )}
                            <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => download(row.id, "csv")}>
                              <FileText className="h-3.5 w-3.5" /> CSV indir
                            </button>
                            <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-slate-50" onClick={() => download(row.id, "xlsx")}>
                              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel indir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Bu filtrede form yok.</td></tr>
            )}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>Toplam {filtered.length.toLocaleString("tr-TR")} form listeleniyor</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40" aria-label="Önceki sayfa">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-blue-600 px-2 text-sm font-medium text-white">{safePage}</span>
            <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)} className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40" aria-label="Sonraki sayfa">
              <ChevronRight className="h-4 w-4" />
            </button>
            <select
              value={limit}
              onChange={(event) => { setLimit(Number(event.target.value)); setPage(1); }}
              className="ml-1 h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm"
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

const actionBtn = "inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 disabled:opacity-60";

function Stat({ icon: Icon, card, iconTone, label, value, hint }: { icon: typeof FileText; card: string; iconTone: string; label: string; value: string; hint: string }) {
  return (
    <article className={`rounded-2xl px-4 py-4 ${card}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconTone}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-semibold leading-tight text-slate-900">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-400">{hint}</p>
    </article>
  );
}

function StatusPill({ status }: { status: FormStatus }) {
  const tone =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-600"
      : status === "EXPIRED"
        ? "bg-red-50 text-red-600"
        : status === "ARCHIVED" || status === "PASSIVE"
          ? "bg-slate-100 text-slate-500"
          : "bg-amber-50 text-amber-600";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{FORM_STATUS_LABELS[status]}</span>;
}

function rateTone(rate: number) {
  if (rate <= 0) return "bg-transparent";
  if (rate >= 80) return "bg-orange-400";
  if (rate >= 40) return "bg-blue-500";
  return "bg-emerald-500";
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}
