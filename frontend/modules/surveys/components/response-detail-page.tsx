"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Check, ChevronLeft, Clock3, FileText, MessageCircle, Phone, User, XCircle } from "lucide-react";
import { surveyService, type SurveyResponseDetail } from "../services/survey.service";

export function SurveyResponseDetailPage({ responseId }: { responseId: string }) {
  const [item, setItem] = useState<SurveyResponseDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    surveyService.response(responseId).then(setItem).catch((err) => setError(err.message));
  }, [responseId]);

  if (error) return <p className="px-6 py-8 text-sm text-red-700">{error}</p>;
  if (!item) return <p className="px-6 py-8 text-sm text-slate-500">Yükleniyor...</p>;

  const duration = item.durationSeconds != null && item.status === "COMPLETED"
    ? `${Math.max(1, Math.round(item.durationSeconds / 60))} dk`
    : "—";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link href="/customer/surveys/responses" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ChevronLeft className="h-4 w-4" /> Anket Sonuçlarına Dön
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{item.surveyName}</h1>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-slate-900">Anket Yanıtı</h2>
              <p className="mt-0.5 text-sm text-slate-500">Bu bölümde seçilen anket yanıtının detaylarını görüntüleyebilirsiniz.</p>
            </div>
          </div>
          <StatusBadge status={item.status} />
        </div>
        <div className="border-t border-slate-100">
          <div className="grid sm:grid-cols-3 sm:divide-x sm:divide-slate-100">
            <Meta icon={User} label="Kişi" value={item.anonymous ? "Anonim" : item.name || "—"} />
            <Meta icon={Phone} label="Telefon" value={item.anonymous ? "—" : item.phone || "—"} />
            <Meta icon={Clock3} label="Süre" value={duration} />
          </div>
          <div className="grid border-t border-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-slate-100">
            <Meta icon={Calendar} label="Başlangıç" value={formatDate(item.startedAt)} />
            <Meta icon={Clock3} label="Bitiş" value={formatDate(item.completedAt)} />
          </div>
        </div>
      </section>

      <div className="mt-4 space-y-4">
        {item.answers.map((answer, index) => (
          <section key={`${answer.question}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-600">{index + 1}</span>
              <h2 className="font-semibold text-slate-900">Soru {index + 1}</h2>
            </div>
            <div className="border-t border-slate-100 px-6 py-4">
              <p className="text-xs text-slate-400">Soru Metni</p>
              <p className="mt-1 font-semibold text-slate-900">{answer.question || "—"}</p>
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
                <p className="flex items-center gap-2 text-xs text-slate-400">
                  <MessageCircle className="h-3.5 w-3.5" /> Yanıt
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">{answer.value || "—"}</p>
              </div>
            </div>
          </section>
        ))}
        {item.answers.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-400">Bu yanıtta cevap yok.</p>
        )}
      </div>
    </div>
  );
}

function Meta({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-6 py-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="mt-0.5 font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-600"><Check className="h-4 w-4" /> Tamamlandı</span>;
  }
  if (status === "CANCELLED") {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-600"><XCircle className="h-4 w-4" /> Geçersiz</span>;
  }
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-600"><Clock3 className="h-4 w-4" /> Başlayan</span>;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
