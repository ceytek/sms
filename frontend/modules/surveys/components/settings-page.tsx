"use client";

import { useEffect, useState } from "react";
import { surveyService } from "../services/survey.service";

export function SurveySettingsPage() {
  const [thankYou, setThankYou] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    surveyService.settings().then((row) => {
      setThankYou(row.defaultThankYou);
      setSmsBody(row.defaultSmsBody);
    }).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Anket ayarları</h1>
      <p className="mt-1 text-sm text-slate-500">Yeni anketlerde kullanılacak varsayılan metinler.</p>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="mt-3 text-sm text-emerald-700">{notice}</p>}
      <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <label className="block text-sm font-medium text-slate-700">Varsayılan teşekkür mesajı
          <textarea className="mt-1 h-24 w-full rounded-xl border border-slate-200 px-3 py-2" value={thankYou} onChange={(event) => setThankYou(event.target.value)} />
        </label>
        <label className="block text-sm font-medium text-slate-700">Varsayılan SMS metni
          <textarea className="mt-1 h-24 w-full rounded-xl border border-slate-200 px-3 py-2" value={smsBody} onChange={(event) => setSmsBody(event.target.value)} />
        </label>
        <button
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          onClick={() => surveyService.updateSettings({ defaultThankYou: thankYou, defaultSmsBody: smsBody }).then(() => setNotice("Kaydedildi")).catch((err) => setError(err.message))}
        >
          Kaydet
        </button>
      </div>
    </div>
  );
}
