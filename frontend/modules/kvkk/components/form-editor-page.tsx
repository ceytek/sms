"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { kvkkService } from "../services/kvkk.service";
import type { KvkkSettings, KvkkTextDocument } from "../types";
import { kvkkMediaUrl, selectClass } from "../types";

type Box = { label: string; isRequired: boolean; isActive: boolean };

export function KvkkFormEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === "new";
  const [texts, setTexts] = useState<KvkkTextDocument[]>([]);
  const [settings, setSettings] = useState<KvkkSettings | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [textDocumentId, setTextDocumentId] = useState("");
  const [checkboxes, setCheckboxes] = useState<Box[]>([
    { label: "Aydınlatma metnini okudum.", isRequired: true, isActive: true },
    { label: "SMS gönderilmesine izin veriyorum.", isRequired: true, isActive: true },
  ]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void kvkkService.listTexts().then(setTexts);
    void kvkkService.getSettings().then(setSettings);
    if (!isNew) {
      void kvkkService.getForm(params.id).then((form) => {
        setName(form.name);
        setTitle(form.title);
        setSubtitle(form.subtitle);
        setDescription(form.description);
        setTextDocumentId(form.textDocumentId ?? "");
        setCheckboxes(form.checkboxes.map((item) => ({ label: item.label, isRequired: item.isRequired, isActive: item.isActive })));
      });
    }
  }, [isNew, params.id]);

  const save = async () => {
    setSaving(true);
    setError("");
    const payload = {
      name, title, subtitle, description,
      textDocumentId: textDocumentId || undefined,
      checkboxes,
    };
    try {
      if (isNew) {
        await kvkkService.createForm(payload);
        router.push("/customer/kvkk/consent-forms");
      } else {
        await kvkkService.updateForm(params.id, payload);
        router.push("/customer/kvkk/consent-forms");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <Link href="/customer/kvkk/consent-forms" className="mb-4 inline-block text-sm text-blue-600">← Form listesi</Link>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{isNew ? "Yeni Form" : "Formu Düzenle"}</h1>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            {settings?.logoUrl && <img src={kvkkMediaUrl(settings.logoUrl, settings.updatedAt)} alt="" className="h-10 object-contain" />}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-500">Firma görünümü KVKK Ayarları’ndan gelir</p>
              <p className="font-medium text-slate-900">{settings?.companyDisplayName || "Firma adı henüz ayarlanmadı"}</p>
              {settings?.contactInfo && <p className="text-sm text-slate-500">{settings.contactInfo}</p>}
            </div>
            <Link href="/customer/kvkk/settings" className="text-sm text-blue-600">Ayarları düzenle</Link>
          </div>
        </div>
        <Field label="Form adı"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Form başlığı"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Açıklama"><Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} /></Field>
        <Field label="KVKK metni">
          <select className={selectClass} value={textDocumentId} onChange={(e) => setTextDocumentId(e.target.value)}>
            <option value="">Seçilmedi</option>
            {texts.map((item) => <option key={item.id} value={item.id}>{item.name} (v{item.currentVersion?.version})</option>)}
          </select>
        </Field>
        <div>
          <Label>Onay kutuları</Label>
          <div className="mt-2 space-y-2">
            {checkboxes.map((box, index) => (
              <div key={index} className="flex gap-2">
                <Input value={box.label} onChange={(e) => setCheckboxes((current) => current.map((item, i) => i === index ? { ...item, label: e.target.value } : item))} />
                <label className="flex items-center gap-1 text-xs text-slate-500">
                  <input type="checkbox" checked={box.isRequired} onChange={(e) => setCheckboxes((current) => current.map((item, i) => i === index ? { ...item, isRequired: e.target.checked } : item))} />
                  Zorunlu
                </label>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => setCheckboxes((current) => [...current, { label: "", isRequired: false, isActive: true }])}>Kutu ekle</Button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button className="bg-blue-600 hover:bg-blue-700" disabled={saving || !name.trim() || !title.trim()} onClick={() => void save()}>Kaydet</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}
