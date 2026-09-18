"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { kvkkService } from "../services/kvkk.service";
import type { KvkkSettings } from "../types";
import { kvkkMediaUrl } from "../types";

function hasBranding(settings: KvkkSettings) {
  return Boolean(settings.companyDisplayName.trim() || settings.logoUrl || settings.contactInfo.trim());
}

export function KvkkSettingsPage() {
  const [settings, setSettings] = useState<KvkkSettings | null>(null);
  const [draft, setDraft] = useState({ companyDisplayName: "", contactInfo: "" });
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void kvkkService
      .getSettings()
      .then((result) => {
        setSettings(result);
        setDraft({ companyDisplayName: result.companyDisplayName, contactInfo: result.contactInfo });
        setEditing(!hasBranding(result));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Ayarlar yüklenemedi"));
  }, []);

  const startEdit = () => {
    if (!settings) return;
    setDraft({ companyDisplayName: settings.companyDisplayName, contactInfo: settings.contactInfo });
    setEditing(true);
    setSaved(false);
  };

  const saveBranding = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const result = await kvkkService.updateSettings({
        companyDisplayName: draft.companyDisplayName,
        contactInfo: draft.contactInfo,
      });
      setSettings(result);
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const toggleSms = async (checked: boolean) => {
    if (!settings) return;
    setSettings({ ...settings, smsConsentCheckEnabled: checked });
    try {
      setSettings(await kvkkService.updateSettings({ smsConsentCheckEnabled: checked }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaydedilemedi");
    }
  };

  const onLogo = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      setSettings(await kvkkService.uploadLogo(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo yüklenemedi");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!settings) return <p className="p-6 text-sm text-slate-500">{error || "Yükleniyor..."}</p>;

  const showTable = hasBranding(settings);
  const logoSrc = kvkkMediaUrl(settings.logoUrl, settings.updatedAt);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">KVKK Ayarları</h1>
      <p className="mb-6 text-sm text-slate-500">Form görünümü ve SMS gönderiminde izin kontrolü. Firma adı, logo ve iletişim tüm formlarda buradan gelir.</p>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
          <div>
            <p className="font-medium">SMS gönderiminde KVKK izin kontrolü yap</p>
            <p className="text-xs text-slate-500">Açıksa aktif izni olmayan numaralar gönderim listesinden çıkarılır.</p>
          </div>
          <Switch checked={settings.smsConsentCheckEnabled} onCheckedChange={(checked) => void toggleSms(checked)} />
        </div>
        {editing && (
          <div className="space-y-4 border-t border-slate-100 pt-4">
            <div className="space-y-1.5">
              <Label>Formda görünecek firma adı</Label>
              <Input value={draft.companyDisplayName} onChange={(e) => setDraft({ ...draft, companyDisplayName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Logo</Label>
              <div className="flex flex-wrap items-center gap-3">
                {logoSrc && <img src={logoSrc} alt="" className="h-12 max-w-[160px] object-contain" />}
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void onLogo(e.target.files?.[0])} />
                <Button type="button" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? "Yükleniyor..." : settings.logoUrl ? "Logoyu değiştir" : "Logo yükle"}
                </Button>
              </div>
              <p className="text-xs text-slate-400">PNG, JPG veya WEBP. En fazla 2 MB.</p>
            </div>
            <div className="space-y-1.5">
              <Label>İletişim bilgileri</Label>
              <Input value={draft.contactInfo} onChange={(e) => setDraft({ ...draft, contactInfo: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button className="bg-blue-600 hover:bg-blue-700" disabled={saving} onClick={() => void saveBranding()}>Kaydet</Button>
              {showTable && (
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>İptal</Button>
              )}
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && !editing && <p className="text-sm text-emerald-700">Kaydedildi</p>}
      </div>
      {showTable && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Logo</th>
                <th className="px-4 py-3 font-medium">Firma adı</th>
                <th className="px-4 py-3 font-medium">İletişim</th>
                <th className="px-4 py-3 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-3">
                  {logoSrc ? <img src={logoSrc} alt="" className="h-10 max-w-[120px] object-contain" /> : <span className="text-slate-400">Yok</span>}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">{settings.companyDisplayName || "-"}</td>
                <td className="px-4 py-3 text-slate-600">{settings.contactInfo || "-"}</td>
                <td className="px-4 py-3">
                  <Button type="button" variant="outline" size="sm" onClick={startEdit}>Düzenle</Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
