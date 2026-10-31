"use client";

import { useEffect, useState } from "react";
import { formService } from "../services/form.service";
import type { PublicForm, FormFieldType } from "../types";

export function PublicFormPage({ slug, token }: { slug?: string; token?: string }) {
  const [form, setForm] = useState<PublicForm | null>(null);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = token ? formService.publicByToken(token) : slug ? formService.publicBySlug(slug) : Promise.reject("No slug or token");
    load.then((f) => {
      setForm(f);
      if ((f as any).alreadyCompleted && !(f as any).allowEdit) {
        setDone(true);
        setMessage("Bu form daha önce doldurulmuş.");
      }
      const defaults: Record<string, unknown> = {};
      for (const field of f.fields) {
        if (field.defaultValue) defaults[field.id] = field.defaultValue;
      }
      setData(defaults);
    }).catch((e) => setError(e instanceof Error ? e.message : "Form yüklenemedi"));
  }, [slug, token]);

  const submit = async () => {
    setSubmitting(true); setError("");
    try {
      const result = token ? await formService.publicSubmitToken(token, data) : slug ? await formService.publicSubmitSlug(slug, data) : null;
      if (result?.ok) { setDone(true); setMessage(result.message || "Başarıyla gönderildi."); }
    } catch (e) { setError(e instanceof Error ? e.message : "Gönderim hatası"); }
    setSubmitting(false);
  };

  if (error && !form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow">
          <p className="text-lg font-semibold text-red-600">{error}</p>
        </div>
      </div>
    );
  }
  if (!form) return <div className="flex min-h-screen items-center justify-center"><p className="text-slate-400">Yükleniyor...</p></div>;

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow">
          {form.logoUrl && <img src={form.logoUrl} alt="" className="mx-auto mb-4 h-16 w-16 rounded-full object-cover" />}
          <h2 className="text-xl font-bold text-slate-900">{form.companyName}</h2>
          <p className="mt-4 text-slate-600">{message}</p>
        </div>
      </div>
    );
  }

  const set = (fieldId: string, value: unknown) => setData((d) => ({ ...d, [fieldId]: value }));

  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50 p-4 pt-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow space-y-6">
        {form.logoUrl && <img src={form.logoUrl} alt="" className="mx-auto h-16 w-16 rounded-full object-cover" />}
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">{form.title}</h1>
          {form.companyName && <p className="text-sm text-slate-500">{form.companyName}</p>}
          {form.description && <p className="mt-2 text-sm text-slate-600">{form.description}</p>}
        </div>

        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="space-y-4">
          {form.fields.map((field) => {
            if (field.type === "HEADING") return (
              <div key={field.id} className="pt-2">
                <h3 className="font-semibold text-slate-800">{field.label}</h3>
                {field.description && <p className="text-xs text-slate-500">{field.description}</p>}
              </div>
            );
            const val = data[field.id] ?? "";
            return (
              <div key={field.id}>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.description && <p className="mb-1 text-xs text-slate-500">{field.description}</p>}
                {renderInput(field, val, (v) => set(field.id, v))}
              </div>
            );
          })}
        </div>

        <button onClick={submit} disabled={submitting} className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {submitting ? "Gönderiliyor..." : "Gönder"}
        </button>
      </div>
    </div>
  );
}

function renderInput(
  field: PublicForm["fields"][number],
  value: unknown,
  onChange: (v: unknown) => void,
) {
  const type = field.type as FormFieldType;
  const text = String(value ?? "");
  const cls = "w-full rounded-lg border px-3 py-2 text-sm";

  if (type === "LONG_TEXT" || type === "ADDRESS") {
    return <textarea value={text} onChange={(e) => onChange(e.target.value)} rows={3} className={cls} placeholder={field.placeholder} />;
  }
  if (type === "CHECKBOX") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="rounded" />
        {field.label}
      </label>
    );
  }
  if (type === "YES_NO") {
    return (
      <div className="flex gap-3">
        {(field.options ?? []).map((o) => (
          <label key={o.label} className="flex items-center gap-1.5 text-sm">
            <input type="radio" name={field.id} checked={text === o.label} onChange={() => onChange(o.label)} />
            {o.label}
          </label>
        ))}
      </div>
    );
  }
  if (type === "SINGLE_CHOICE") {
    return (
      <div className="space-y-1.5">
        {(field.options ?? []).map((o) => (
          <label key={o.label} className="flex items-center gap-2 text-sm">
            <input type="radio" name={field.id} checked={text === o.label} onChange={() => onChange(o.label)} />
            {o.label}
          </label>
        ))}
      </div>
    );
  }
  if (type === "MULTIPLE_CHOICE") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="space-y-1.5">
        {(field.options ?? []).map((o) => (
          <label key={o.label} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selected.includes(o.label)} onChange={(e) => {
              const next = e.target.checked ? [...selected, o.label] : selected.filter((s) => s !== o.label);
              onChange(next);
            }} className="rounded" />
            {o.label}
          </label>
        ))}
      </div>
    );
  }
  if (type === "DROPDOWN") {
    return (
      <select value={text} onChange={(e) => onChange(e.target.value)} className={cls}>
        <option value="">{field.placeholder || "Seçiniz"}</option>
        {(field.options ?? []).map((o) => <option key={o.label} value={o.label}>{o.label}</option>)}
      </select>
    );
  }
  if (type === "DATE") return <input type="date" value={text} onChange={(e) => onChange(e.target.value)} className={cls} />;
  if (type === "TIME") return <input type="time" value={text} onChange={(e) => onChange(e.target.value)} className={cls} />;
  if (type === "NUMBER") return <input type="number" value={text} onChange={(e) => onChange(e.target.value)} className={cls} placeholder={field.placeholder} />;
  if (type === "EMAIL") return <input type="email" value={text} onChange={(e) => onChange(e.target.value)} className={cls} placeholder={field.placeholder || "ornek@mail.com"} />;
  if (type === "PHONE") return <input type="tel" value={text} onChange={(e) => onChange(e.target.value)} className={cls} placeholder={field.placeholder || "05xx xxx xx xx"} />;
  if (type === "FILE_UPLOAD") return <input type="file" onChange={(e) => onChange(e.target.files?.[0]?.name || "")} className={cls} />;
  return <input type="text" value={text} onChange={(e) => onChange(e.target.value)} className={cls} placeholder={field.placeholder} />;
}
