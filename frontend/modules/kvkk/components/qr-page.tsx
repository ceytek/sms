"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { kvkkService } from "../services/kvkk.service";
import type { KvkkFormRecord, KvkkQrRecord } from "../types";
import { selectClass } from "../types";

export function KvkkQrPage() {
  const [items, setItems] = useState<KvkkQrRecord[]>([]);
  const [forms, setForms] = useState<KvkkFormRecord[]>([]);
  const [name, setName] = useState("");
  const [formId, setFormId] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [qr, formList] = await Promise.all([kvkkService.listQr(), kvkkService.listForms()]);
    setItems(qr);
    setForms(formList.filter((item) => item.isActive));
  }, []);

  useEffect(() => { void load().catch((err) => setError(err instanceof Error ? err.message : "Yüklenemedi")); }, [load]);

  const save = async () => {
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      await kvkkService.createQr({ name, formId, description, expiresAt: expiresAt || undefined });
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "QR oluşturulamadı");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2"><Label>QR adı</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mağaza girişi" /></div>
        <div className="space-y-1.5">
          <Label>Form</Label>
          <select className={selectClass} value={formId} onChange={(e) => setFormId(e.target.value)}>
            <option value="">Seçin</option>
            {forms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5"><Label>Kullanım süresi</Label><Input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Açıklama</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <Button className="bg-blue-600 hover:bg-blue-700" disabled={saving || !name.trim() || !formId} onClick={() => void save()}>Yeni QR Kod Oluştur</Button>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="space-y-3">
        {items.map((item) => <QrPreview key={item.id} qr={item} />)}
      </div>
    </>
  );
}

function QrPreview({ qr }: { qr: KvkkQrRecord }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qr.publicUrl)}`;
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <img src={src} alt={qr.name} className="h-28 w-28 rounded bg-white" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{qr.name}</p>
        <p className="text-sm text-slate-500">{qr.formName} · {qr.isActive ? "Aktif" : "Pasif"}</p>
        <p className="break-all text-xs text-blue-700">{qr.publicUrl}</p>
        <a className="mt-2 inline-block text-sm text-blue-600" href={src} download={`${qr.name}.png`}>İndir</a>
      </div>
    </div>
  );
}
