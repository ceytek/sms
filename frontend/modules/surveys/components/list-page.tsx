"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  FileSpreadsheet,
  FileText,
  Filter,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  PieChart,
  Play,
  Plus,
  Search,
  Send,
  Star,
  Users,
  X,
} from "lucide-react";
import { contactGroupsService } from "@/modules/contacts/services/groups.service";
import type { ContactGroupRecord } from "@/modules/contacts/types";
import { parseGsmNumbers } from "@/lib/phone";
import { analyzeSms } from "@/modules/messaging/sms-text";
import { smsSendService } from "@/modules/messaging/services/sms-send.service";
import { surveyService } from "../services/survey.service";
import { SURVEY_STATUS_LABELS, type SurveyRecord, type SurveySource, type SurveyStatus } from "../types";

const ROW_ICONS = [
  { icon: FileText, wrap: "bg-blue-100 text-blue-600" },
  { icon: Users, wrap: "bg-emerald-100 text-emerald-600" },
  { icon: Star, wrap: "bg-violet-100 text-violet-600" },
  { icon: CalendarRange, wrap: "bg-orange-100 text-orange-500" },
  { icon: MessageCircle, wrap: "bg-pink-100 text-pink-500" },
  { icon: BarChart3, wrap: "bg-teal-100 text-teal-600" },
];

export function SurveyListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SurveyRecord[]>([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, sent: 0, responses: 0, responseRate: 0, incomplete: 0 });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SurveyStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ query: "", status: "" as SurveyStatus | "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [menuId, setMenuId] = useState("");
  const [busy, setBusy] = useState("");
  const [sendTarget, setSendTarget] = useState<SurveyRecord | null>(null);

  const load = () => {
    surveyService.list().then(setRows).catch((err) => setError(err instanceof Error ? err.message : "Anketler yüklenemedi"));
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

  const download = async (id: string, format: "csv" | "xlsx") => {
    setMenuId("");
    setBusy(id + format);
    try {
      const blob = await surveyService.download(id, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `anket.${format === "xlsx" ? "xlsx" : "csv"}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dışa aktarma başarısız");
    } finally {
      setBusy("");
    }
  };

  const copy = (id: string) => {
    setMenuId("");
    setBusy(id);
    surveyService.copy(id)
      .then((created) => router.push(`/customer/surveys/${created.id}`))
      .catch((err) => setError(err instanceof Error ? err.message : "Kopyalanamadı"))
      .finally(() => setBusy(""));
  };

  const openSend = (row: SurveyRecord) => {
    if (row.status !== "ACTIVE") return;
    setError("");
    setNotice("");
    setSendTarget(row);
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8" onClick={() => setMenuId("")}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Anketler</h1>
          <p className="mt-1 text-sm text-slate-500">Oluşturduğunuz tüm anketleri görüntüleyebilir, düzenleyebilir ve sonuçlarını analiz edebilirsiniz.</p>
        </div>
        <Link href="/customer/surveys/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Yeni Anket Oluştur
        </Link>
      </div>

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Stat icon={FileText} card="bg-blue-50" iconTone="bg-white text-blue-600" label="Toplam Anket" value={summary.total.toLocaleString("tr-TR")} hint="Tüm anketler" />
        <Stat icon={Play} card="bg-emerald-50" iconTone="bg-white text-emerald-600" label="Aktif Anket" value={summary.active.toLocaleString("tr-TR")} hint="Devam ediyor" />
        <Stat icon={Send} card="bg-violet-50" iconTone="bg-white text-violet-600" label="Toplam Gönderim" value={summary.sent.toLocaleString("tr-TR")} hint="Tüm anketler" />
        <Stat icon={Users} card="bg-sky-50" iconTone="bg-white text-sky-600" label="Toplam Yanıt" value={summary.responses.toLocaleString("tr-TR")} hint="Tüm anketler" />
        <Stat icon={PieChart} card="bg-amber-50" iconTone="bg-white text-amber-500" label="Yanıt Oranı" value={`%${summary.responseRate.toLocaleString("tr-TR")}`} hint="Ortalama oran" />
        <Stat icon={Clock3} card="bg-rose-50" iconTone="bg-white text-rose-500" label="Tamamlanmayan" value={summary.incomplete.toLocaleString("tr-TR")} hint="Yarım kalan yanıt" />
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
            placeholder="Anket adı ile ara..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400"
          />
        </label>
        <select value={status} onChange={(event) => setStatus(event.target.value as SurveyStatus | "")} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700">
          <option value="">Tüm durumlar</option>
          {(Object.keys(SURVEY_STATUS_LABELS) as SurveyStatus[]).map((item) => (
            <option key={item} value={item}>{SURVEY_STATUS_LABELS[item]}</option>
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
                <th className="w-[18%] px-3 py-3 font-medium">Anket</th>
                <th className="w-[8%] px-3 py-3 font-medium">Durum</th>
                <th className="w-[8%] px-3 py-3 font-medium">Gönderilen</th>
                <th className="w-[6%] px-3 py-3 font-medium">Yanıt</th>
                <th className="w-[7%] px-3 py-3 font-medium">Oran</th>
                <th className="w-[9%] px-3 py-3 font-medium">Başlangıç</th>
                <th className="w-[9%] px-3 py-3 font-medium">Bitiş</th>
                <th className="px-3 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row, index) => {
                const visual = ROW_ICONS[((safePage - 1) * limit + index) % ROW_ICONS.length];
                const Icon = visual.icon;
                const subtitle = row.description || (row.formTitle && row.formTitle !== row.name ? row.formTitle : "");
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
                    <td className="px-3 py-3 tabular-nums text-slate-700">{row.sent.toLocaleString("tr-TR")}</td>
                    <td className="px-3 py-3 tabular-nums text-slate-700">{row.completed.toLocaleString("tr-TR")}</td>
                    <td className="px-3 py-3">
                      <div className="w-16">
                        <div className="text-xs font-medium text-slate-600">%{row.responseRate.toLocaleString("tr-TR")}</div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                          <div className={`h-full rounded-full ${rateTone(row.responseRate)}`} style={{ width: `${Math.min(100, row.responseRate)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(row.startsAt)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-500">{formatDate(row.endsAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Link href={`/customer/surveys/${row.id}`} className={actionBtn}>
                          <Pencil className="h-3.5 w-3.5" /> Düzenle
                        </Link>
                        <Link href={`/customer/surveys/${row.id}/results`} className={actionBtn}>
                          <BarChart3 className="h-3.5 w-3.5" /> Sonuç
                        </Link>
                        {row.status === "ACTIVE" && (
                          <button type="button" disabled={busy === row.id} onClick={() => openSend(row)} className={actionBtn}>
                            <Send className="h-3.5 w-3.5" /> Gönder
                          </button>
                        )}
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
                            <div className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-lg" onClick={(event) => event.stopPropagation()}>
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
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Bu filtrede anket yok.</td></tr>
              )}
            </tbody>
          </table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>Toplam {filtered.length.toLocaleString("tr-TR")} anket listeleniyor</span>
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
      {sendTarget && (
        <SendSurveyDialog
          survey={sendTarget}
          onClose={() => setSendTarget(null)}
          onSent={(result) => {
            setSendTarget(null);
            const sent = `${result.validRecipientCount.toLocaleString("tr-TR")} kişiye gönderim kuyruğa alındı.`;
            const skipped = result.skippedCount
              ? ` ${result.skippedCount.toLocaleString("tr-TR")} kişi daha önce aldığı için atlandı.`
              : "";
            setNotice(`${sent}${skipped}`);
            load();
          }}
        />
      )}
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

function SendSurveyDialog({
  survey,
  onClose,
  onSent,
}: {
  survey: SurveyRecord;
  onClose: () => void;
  onSent: (result: { validRecipientCount: number; skippedCount?: number }) => void;
}) {
  const saved = survey.audience?.sources ?? [];
  const [originators, setOriginators] = useState<{ id: string; name: string }[]>([]);
  const [groups, setGroups] = useState<ContactGroupRecord[]>([]);
  const [originatorId, setOriginatorId] = useState(survey.originatorId || "");
  const [body, setBody] = useState(survey.smsBody || "{survey_link}");
  const [groupIds, setGroupIds] = useState<string[]>(saved.filter((source) => source.type === "CONTACT_GROUP" && source.groupId).map((source) => source.groupId as string));
  const [book, setBook] = useState(saved.some((source) => source.type === "CONTACT_BOOK"));
  const [manual, setManual] = useState(
    saved.filter((source) => source.type === "MANUAL" || source.type === "FILE").flatMap((source) => source.phones ?? []).join("\n"),
  );
  const [groupQuery, setGroupQuery] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    contactGroupsService.list().then(setGroups).catch(() => setGroups([]));
    smsSendService.originators().then((rows) => setOriginators(rows.items ?? [])).catch(() => setOriginators([]));
  }, []);

  const visibleGroups = groups.filter((group) => {
    const query = groupQuery.trim().toLocaleLowerCase("tr-TR");
    if (!query) return true;
    return `${group.name} ${group.description || ""}`.toLocaleLowerCase("tr-TR").includes(query);
  });
  const parsed = parseGsmNumbers(manual);

  const toggleGroup = (id: string) => {
    setGroupIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const submit = () => {
    if (!originatorId) {
      setError("SMS başlığı seçin.");
      return;
    }
    if (!body.trim()) {
      setError("SMS metnini yazın.");
      return;
    }
    if (parsed.rejected.length) {
      setError(`Geçersiz numara: ${parsed.rejected.slice(0, 3).join(", ")}`);
      return;
    }
    const sources: SurveySource[] = [];
    if (book) sources.push({ type: "CONTACT_BOOK", label: "Tüm rehber" });
    for (const id of groupIds) {
      const group = groups.find((item) => item.id === id);
      sources.push({ type: "CONTACT_GROUP", groupId: id, label: group?.name || "Grup" });
    }
    if (parsed.valid.length) sources.push({ type: "MANUAL", label: `Manuel ${parsed.valid.length}`, phones: parsed.valid });
    if (!sources.length) {
      setError("Grup seçin veya numara yazın.");
      return;
    }
    setSending(true);
    setError("");
    surveyService.distribute(survey.id, { originatorId, body: body.trim(), sources })
      .then((result) => onSent(result))
      .catch((err) => setError(err instanceof Error ? err.message : "Gönderilemedi"))
      .finally(() => setSending(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Anket gönder</h2>
            <p className="mt-0.5 text-sm text-slate-500">{survey.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Kapat">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-4 overflow-y-auto px-5 py-4">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-slate-700">SMS başlığı</span>
            <select className={`${fieldClass} h-10`} value={originatorId} onChange={(event) => setOriginatorId(event.target.value)}>
              <option value="">Başlık seçin</option>
              {originators.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-slate-700">SMS metni</span>
            <textarea className={`${fieldClass} h-20 py-2`} value={body} onChange={(event) => setBody(event.target.value)} />
            <SmsCount body={body} onApply={setBody} />
            <span className="text-xs text-slate-400">{"{survey_link}"} alıcının anket bağlantısı olur.</span>
          </label>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Gruplar</p>
            <label className="relative mb-2 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className={`${fieldClass} h-10 pl-9`} value={groupQuery} onChange={(event) => setGroupQuery(event.target.value)} placeholder="Grup ara" />
            </label>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
              <label className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-sm">
                <input type="checkbox" checked={book} onChange={(event) => setBook(event.target.checked)} />
                <span className="font-medium text-slate-800">Tüm rehber</span>
              </label>
              {visibleGroups.map((group) => (
                <label key={group.id} className="flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-sm last:border-b-0">
                  <input type="checkbox" checked={groupIds.includes(group.id)} onChange={() => toggleGroup(group.id)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-slate-800">{group.name}</span>
                    <span className="block text-xs text-slate-400">{group.memberCount.toLocaleString("tr-TR")} kişi</span>
                  </span>
                </label>
              ))}
              {visibleGroups.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate-400">Grup bulunamadı.</p>}
            </div>
          </div>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium text-slate-700">Manuel numara</span>
            <textarea
              className={`${fieldClass} h-24 py-2`}
              value={manual}
              onChange={(event) => setManual(event.target.value)}
              placeholder={"Her satıra bir numara\n0532 000 00 00"}
            />
            <span className="text-xs text-slate-400">
              {parsed.valid.length > 0 ? `${parsed.valid.length.toLocaleString("tr-TR")} geçerli numara` : "İstersen buraya da numara yazabilirsin."}
            </span>
          </label>
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <p className="mr-auto text-xs text-slate-400">Daha önce giden kişilere tekrar gitmez.</p>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Vazgeç</button>
          <button type="button" disabled={sending} onClick={submit} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
            <Send className="h-4 w-4" /> {sending ? "Gönderiliyor" : "Gönder"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SmsCount({ body, onApply }: { body: string; onApply: (value: string) => void }) {
  const analysis = analyzeSms(body);
  return (
    <span className="space-y-2 text-xs text-slate-500">
      <span className="block text-right">
        Karakter: {analysis.length.toLocaleString("tr-TR")} · {analysis.encoding === "UCS2" ? "Unicode" : "GSM-7"} · {analysis.parts} SMS
      </span>
      {analysis.saving > 0 && (
        <span className="block rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-amber-900">
          <span className="block font-medium">Optimize edilmiş alternatif · {analysis.saving} SMS kazanç</span>
          <span className="mt-1 block whitespace-pre-wrap text-amber-800">{analysis.optimized}</span>
          <button type="button" className="mt-2 font-medium text-blue-700" onClick={() => onApply(analysis.optimized)}>Metne uygula</button>
        </span>
      )}
    </span>
  );
}

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400";

function StatusPill({ status }: { status: SurveyStatus }) {
  const tone =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-600"
      : status === "COMPLETED"
        ? "bg-sky-50 text-sky-700"
        : status === "CANCELLED" || status === "EXPIRED"
          ? "bg-slate-100 text-slate-500"
          : "bg-amber-50 text-amber-600";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>{SURVEY_STATUS_LABELS[status]}</span>;
}

function rateTone(rate: number) {
  if (rate <= 0) return "bg-transparent";
  if (rate >= 60) return "bg-emerald-500";
  if (rate >= 40) return "bg-blue-500";
  return "bg-orange-400";
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}
