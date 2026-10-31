"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Check,
  FileSpreadsheet,
  FileText,
  Flag,
  Info,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Percent,
  Play,
  QrCode,
  Send,
  Star,
} from "lucide-react";
import { surveyService, type SurveyResults } from "../services/survey.service";

const TEXT_TYPES = new Set(["SHORT_TEXT", "LONG_TEXT", "DATE"]);

export function SurveyResultsPage({ surveyId }: { surveyId: string }) {
  const [data, setData] = useState<SurveyResults | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    surveyService.results(surveyId).then(setData).catch((err) => setError(err instanceof Error ? err.message : "Sonuçlar yüklenemedi"));
  }, [surveyId]);

  const download = async (format: "csv" | "xlsx") => {
    setError("");
    setBusy(format);
    try {
      const blob = await surveyService.download(surveyId, format);
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

  const qr = async (format: "svg" | "png") => {
    setError("");
    setBusy(format);
    try {
      const blob = await surveyService.qr(surveyId, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `anket-qr.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "QR oluşturulamadı");
    } finally {
      setBusy("");
    }
  };

  const remind = async () => {
    if (!data || busy) return;
    setError("");
    setNotice("");
    setBusy("remind");
    try {
      const survey = await surveyService.get(surveyId);
      if (!survey.originatorId) {
        setError("Hatırlatma için SMS başlığı gerekli.");
        return;
      }
      const result = await surveyService.remind(surveyId, { originatorId: survey.originatorId, body: survey.smsBody || "{survey_link}" });
      setNotice(`${result.validRecipientCount.toLocaleString("tr-TR")} kişiye hatırlatma kuyruğa alındı.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hatırlatma gönderilemedi.");
    } finally {
      setBusy("");
    }
  };

  const funnel = data?.funnel;
  const rate = funnel ? `%${funnel.responseRate.toLocaleString("tr-TR")}` : "%0";

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{data?.survey.name || "Sonuçlar"}</h1>
          <p className="mt-1 text-sm text-slate-500">Anket sonuç özeti ve performans analizi</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/customer/surveys/${surveyId}`} className={ghostBtn}>
            <Pencil className="h-4 w-4" /> Düzenle
          </Link>
          <button type="button" onClick={() => download("csv")} disabled={busy === "csv"} className={ghostBtn}>
            <FileText className="h-4 w-4" /> CSV
          </button>
          <button type="button" onClick={() => download("xlsx")} disabled={busy === "xlsx"} className={ghostBtn}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </button>
          <button type="button" onClick={() => qr("png")} disabled={busy === "png"} className={ghostBtn}>
            <QrCode className="h-4 w-4" /> QR PNG
          </button>
          <button type="button" onClick={() => qr("svg")} disabled={busy === "svg"} className={ghostBtn}>
            <QrCode className="h-4 w-4" /> QR SVG
          </button>
          <button type="button" onClick={remind} disabled={busy === "remind"} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">
            <Send className="h-4 w-4" /> Hatırlatma Gönder
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

      {funnel && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Stat icon={Send} wrap="bg-blue-50 text-blue-600" label="Gönderilen" hint="Toplam gönderim" value={funnel.sent.toLocaleString("tr-TR")} />
          <Stat icon={Check} wrap="bg-emerald-50 text-emerald-600" label="Teslim edilen" hint="Başarıyla ulaşan" value={funnel.delivered.toLocaleString("tr-TR")} />
          <Stat icon={Mail} wrap="bg-violet-50 text-violet-600" label="Açılan" hint="Bağlantıyı açan" value={funnel.opened.toLocaleString("tr-TR")} />
          <Stat icon={Play} wrap="bg-orange-50 text-orange-600" label="Başlayan" hint="Ankete başlayan" value={funnel.started.toLocaleString("tr-TR")} />
          <Stat icon={Flag} wrap="bg-emerald-50 text-emerald-600" label="Tamamlanan" hint="Anketi tamamlayan" value={funnel.completed.toLocaleString("tr-TR")} />
          <Stat icon={Percent} wrap="bg-rose-50 text-rose-500" label="Yanıt oranı" hint="Tamamlanma oranı" value={rate} />
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {data?.questions.map((question) => {
          if (question.type === "NPS" && question.nps) return <NpsCard key={question.id} question={question} />;
          if (TEXT_TYPES.has(question.type)) return <TextCard key={question.id} question={question} />;
          const rows = question.options.length ? question.options : question.scale;
          return <ChoiceCard key={question.id} title={question.text} rows={rows} total={question.answers} />;
        })}
      </div>
    </div>
  );
}

const ghostBtn = "inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60";

function Stat({ icon: Icon, wrap, label, hint, value }: { icon: typeof Send; wrap: string; label: string; hint: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${wrap}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="text-2xl font-semibold leading-tight text-slate-900">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-400">{hint}</p>
    </article>
  );
}

function CardMenu() {
  return (
    <Link href="/customer/surveys/responses" className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600" aria-label="Yanıtlar">
      <MoreHorizontal className="h-4 w-4" />
    </Link>
  );
}

function ChoiceCard({ title, rows, total }: { title: string; rows: { id?: string; label: string; percent: number }[]; total: number }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          <h2 className="font-semibold text-slate-900">{title}</h2>
        </div>
        <CardMenu />
      </div>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.id || `${index}:${row.label}`}>
            <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
              <span>{row.label}</span>
              <span>%{row.percent.toLocaleString("tr-TR")}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-slate-300" style={{ width: `${Math.min(row.percent, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-right text-xs text-slate-400">Toplam yanıt: {total.toLocaleString("tr-TR")}</p>
    </section>
  );
}

function TextCard({ question }: { question: SurveyResults["questions"][number] }) {
  const texts = question.texts ?? [];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-blue-600" />
          <h2 className="font-semibold text-slate-900">{question.text}</h2>
        </div>
        <CardMenu />
      </div>
      {texts.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-300">
            <MessageCircle className="h-6 w-6" />
          </span>
          <p className="mt-4 font-semibold text-slate-800">Henüz açık uçlu yanıt yok</p>
          <p className="mt-1 text-sm text-slate-400">Bu soru için henüz herhangi bir yanıt toplanmamış.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {texts.map((item, index) => (
            <li key={`${item.createdAt}-${index}`} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{item.text}</li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-right text-xs text-slate-400">Toplam yanıt: {question.answers.toLocaleString("tr-TR")}</p>
    </section>
  );
}

function NpsCard({ question }: { question: SurveyResults["questions"][number] }) {
  const nps = question.nps!;
  const note = nps.score >= 50 ? "Güçlü destek" : nps.score > 0 ? "Olumlu eğilim" : "Gelişim için fırsat var";
  const noteClass = nps.score > 0 ? "text-emerald-600" : "text-rose-500";
  const noteDot = nps.score > 0 ? "bg-emerald-500" : "bg-rose-500";
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          <h2 className="font-semibold text-slate-900">{question.text}</h2>
        </div>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">NPS</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <div className="rounded-xl bg-blue-50 px-3 py-3">
          <p className="flex items-center gap-1 text-xs font-medium text-blue-700">NPS Score <Info className="h-3 w-3" /></p>
          <p className="mt-1 text-3xl font-semibold text-blue-700">{nps.score.toLocaleString("tr-TR")}</p>
          <p className={`mt-1 flex items-center gap-1 text-[11px] ${noteClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${noteDot}`} /> {note}
          </p>
        </div>
        <NpsBucket label="Desteklemeyen" range="(0–6)" value={nps.detractors} className="bg-rose-50 text-rose-600" />
        <NpsBucket label="Nötr" range="(7–8)" value={nps.passives} className="bg-amber-50 text-amber-600" />
        <NpsBucket label="Destekleyen" range="(9–10)" value={nps.promoters} className="bg-emerald-50 text-emerald-600" />
      </div>
      <div className="relative mt-6 px-1">
        <div className="absolute left-2 right-2 top-[5px] h-0.5 bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400" />
        <div className="relative flex justify-between">
          {question.scale.map((point) => (
            <div key={point.label} className="flex w-6 flex-col items-center">
              <span className={`h-3 w-3 rounded-full border-2 border-white ${dotColor(Number(point.label))}`} />
              <span className="mt-2 text-[11px] text-slate-400">{point.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-400">
        <span>Desteklemeyen</span>
        <span>Nötr</span>
        <span>Destekleyen</span>
      </div>
    </section>
  );
}

function NpsBucket({ label, range, value, className }: { label: string; range: string; value: number; className: string }) {
  return (
    <div className={`rounded-xl px-3 py-3 text-center ${className}`}>
      <p className="text-2xl font-semibold">{value.toLocaleString("tr-TR")}</p>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-[11px] opacity-80">{range}</p>
    </div>
  );
}

function dotColor(value: number) {
  if (value <= 6) return "bg-rose-500";
  if (value <= 8) return "bg-amber-400";
  return "bg-emerald-500";
}
