"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClientId } from "@/lib/client-id";
import { loadPublicSurvey, postPublicSurvey } from "../services/survey.service";
import type { PublicSurvey } from "../types";

export function PublicSurveyForm({ slug, token }: { slug?: string; token?: string }) {
  const [form, setForm] = useState<PublicSurvey | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [answers, setAnswers] = useState<Record<string, { optionIds?: string[]; text?: string; number?: number }>>({});
  const [busy, setBusy] = useState(false);
  const sessionKey = useMemo(() => sessionStorageKey(slug, token), [slug, token]);
  const started = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const path = token ? `r/${token}` : `s/${slug}`;
    loadPublicSurvey(path)
      .then((data) => {
        if (!cancelled) setForm(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Anket açılamadı");
      });
    return () => {
      cancelled = true;
    };
  }, [slug, token]);

  const markStarted = () => {
    if (started.current || !sessionKey || form?.alreadyCompleted) return;
    started.current = true;
    const path = token ? `r/${token}` : `s/${slug}`;
    const channel = new URLSearchParams(window.location.search).get("src") === "qr" ? "QR" : token ? "SMS" : "PUBLIC";
    void postPublicSurvey(`${path}/start`, { sessionKey, channel }).catch(() => undefined);
  };

  const visible = (form?.questions ?? []).filter((question) => {
    const rule = question.showWhen;
    if (!rule?.questionId) return true;
    const parent = answers[rule.questionId];
    if (!parent) return false;
    if (rule.optionId) return (parent.optionIds ?? []).includes(rule.optionId);
    if (rule.value != null) return String(parent.number ?? parent.text ?? "") === rule.value;
    return true;
  });
  const answered = visible.filter((question) => {
    const value = answers[question.id];
    return Boolean(value && (value.text || value.optionIds?.length || value.number != null));
  }).length;
  const progress = visible.length ? Math.round((answered / visible.length) * 100) : 0;

  const submit = async () => {
    if (!form) return;
    setBusy(true);
    setError("");
    try {
      const channel = new URLSearchParams(window.location.search).get("src") === "qr" ? "QR" : token ? "SMS" : "PUBLIC";
      const result = await postPublicSurvey(`${token ? `r/${token}` : `s/${slug}`}/responses`, {
        sessionKey,
        channel,
        answers: visible.map((question) => ({ questionId: question.id, ...answers[question.id] })),
      });
      setDone(result.message || form.thankYouMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gönderilemedi");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center px-4">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">{done}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-6">
      {error && <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!form ? <p className="text-sm text-slate-500">Anket açılıyor...</p> : (
        <div className="space-y-4">
          <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {form.logoUrl && <img src={form.logoUrl.startsWith("http") ? form.logoUrl : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/${form.logoUrl}`} alt="" className="mb-3 h-12 w-auto" />}
            <p className="text-sm text-slate-500">{form.companyName}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{form.title}</h1>
            {form.description && <p className="mt-2 text-sm text-slate-600">{form.description}</p>}
            <p className="mt-4 text-xs font-medium text-slate-500">Soru {Math.min(answered + 1, visible.length)} / {visible.length}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-blue-600" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-400">%{progress} tamamlandı</p>
          </header>
          {form.alreadyCompleted ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Bu anketi daha önce yanıtladınız.</p>
          ) : visible.map((question) => (
            <section key={question.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-base font-semibold text-slate-900">{question.text}{question.required ? " *" : ""}</p>
              {question.description && <p className="mt-1 text-sm text-slate-500">{question.description}</p>}
              <div className="mt-4">
                <QuestionInput question={question} value={answers[question.id]} onChange={(value) => { markStarted(); setAnswers({ ...answers, [question.id]: value }); }} />
              </div>
            </section>
          ))}
          {!form.alreadyCompleted && (
            <button disabled={busy} onClick={submit} className="h-12 w-full rounded-2xl bg-blue-600 text-base font-semibold text-white">
              {busy ? "Gönderiliyor" : "Gönder"}
            </button>
          )}
        </div>
      )}
    </main>
  );
}

function sessionStorageKey(slug?: string, token?: string) {
  if (typeof window === "undefined") return "";
  const storageKey = `survey-session-${slug || token}`;
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const created = createClientId();
  window.localStorage.setItem(storageKey, created);
  return created;
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: PublicSurvey["questions"][number];
  value?: { optionIds?: string[]; text?: string; number?: number };
  onChange: (value: { optionIds?: string[]; text?: string; number?: number }) => void;
}) {
  if (question.type === "LONG_TEXT" || question.type === "SHORT_TEXT") {
    const Input = question.type === "LONG_TEXT" ? "textarea" : "input";
    return <Input className="min-h-12 w-full rounded-2xl border border-slate-200 px-3 py-3 text-base" value={value?.text || ""} onChange={(event) => onChange({ text: event.target.value })} />;
  }
  if (question.type === "DATE") {
    return <input type="date" className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-base" value={value?.text || ""} onChange={(event) => onChange({ text: event.target.value })} />;
  }
  if (question.type === "NPS" || question.type === "RATING" || question.type === "STARS") {
    const min = question.type === "NPS" ? 0 : 1;
    const max = question.type === "NPS" ? 10 : 5;
    return (
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: max - min + 1 }, (_, index) => min + index).map((number) => (
          <button key={number} type="button" onClick={() => onChange({ number })} className={`h-12 rounded-2xl border text-base font-semibold ${value?.number === number ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200"}`}>
            {question.type === "STARS" ? "★".repeat(number) : number}
          </button>
        ))}
      </div>
    );
  }
  if (question.type === "DROPDOWN") {
    return (
      <select className="h-12 w-full rounded-2xl border border-slate-200 px-3 text-base" value={value?.optionIds?.[0] || ""} onChange={(event) => onChange({ optionIds: event.target.value ? [event.target.value] : [] })}>
        <option value="">Seçin</option>
        {question.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    );
  }
  const multiple = question.type === "MULTI";
  return (
    <div className="space-y-2">
      {question.options.map((option) => {
        const selected = (value?.optionIds ?? []).includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              if (!multiple) onChange({ optionIds: [option.id] });
              else onChange({ optionIds: selected ? (value?.optionIds ?? []).filter((id) => id !== option.id) : [...(value?.optionIds ?? []), option.id] });
            }}
            className={`flex min-h-12 w-full items-center rounded-2xl border px-4 text-left text-base ${selected ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
