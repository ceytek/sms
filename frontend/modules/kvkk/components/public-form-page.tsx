"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadPublicForm, submitPublicForm } from "../services/kvkk.service";
import type { KvkkFormRecord } from "../types";
import { kvkkMediaUrl } from "../types";

export function KvkkPublicFormPage({ token }: { token: string }) {
  const [form, setForm] = useState<KvkkFormRecord | null>(null);
  const [text, setText] = useState<{ title: string; bodyHtml: string; version: number } | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [email, setEmail] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    void loadPublicForm(token)
      .then((result) => {
        setForm(result.form);
        setText(result.text);
        setFirstName(result.prefill.firstName);
        setLastName(result.prefill.lastName);
        setMobilePhone(result.prefill.mobilePhone);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Form açılamadı"));
  }, [token]);

  const toggle = (id: string) => {
    setChecked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const submit = async () => {
    setError("");
    try {
      await submitPublicForm(token, { firstName, lastName, mobilePhone, email, checkedIds: checked });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gönderilemedi");
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-emerald-700">İzniniz alındı</h1>
        <p className="mt-2 text-sm text-slate-500">Bilgileriniz kayıt altına alındı.</p>
      </div>
    );
  }

  if (!form) {
    return <p className="p-8 text-center text-sm text-slate-500">{error || "Form yükleniyor..."}</p>;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {form.logoUrl && <img src={kvkkMediaUrl(form.logoUrl)} alt="" className="mb-4 h-12 object-contain" />}
        <p className="text-sm font-medium text-blue-700">{form.companyDisplayName}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{form.title}</h1>
        {form.subtitle && <p className="mt-2 text-sm text-slate-500">{form.subtitle}</p>}
        {form.contactInfo && <p className="mt-2 text-xs text-slate-400">{form.contactInfo}</p>}
        {text && (
          <div className="mt-6 rounded-lg bg-slate-50 p-4">
            <h2 className="mb-2 text-sm font-semibold">{text.title} <span className="text-xs text-slate-400">v{text.version}</span></h2>
            <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: text.bodyHtml }} />
          </div>
        )}
        <div className="mt-6 grid gap-3">
          {form.fields.includes("firstName") && <Input placeholder="Ad" value={firstName} onChange={(e) => setFirstName(e.target.value)} />}
          {form.fields.includes("lastName") && <Input placeholder="Soyad" value={lastName} onChange={(e) => setLastName(e.target.value)} />}
          <Input placeholder="Telefon *" value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} />
          {form.fields.includes("email") && <Input placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </div>
        <div className="mt-4 space-y-2">
          {form.checkboxes.map((box) => (
            <label key={box.id} className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" className="mt-1" checked={checked.includes(box.id)} onChange={() => toggle(box.id)} />
              <span>{box.label}{box.isRequired ? " *" : ""}</span>
            </label>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <Button className="mt-6 w-full bg-blue-600 hover:bg-blue-700" onClick={() => void submit()} disabled={!mobilePhone.trim()}>
          Onayla / Gönder
        </Button>
      </div>
    </div>
  );
}
