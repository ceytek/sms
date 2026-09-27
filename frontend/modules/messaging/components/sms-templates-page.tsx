"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { smsSendService, type SmsTemplateRecord } from "../services/sms-send.service";
import { previewSmsTemplate, smsEncodingAndParts } from "../sms-text";

const VARIABLES = ["{firma}", "{yetkili}", "{ad}", "{soyad}", "{telefon}", "{email}"];

export function SmsTemplatesPage() {
  const [items, setItems] = useState<SmsTemplateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await smsSendService.templates();
    setItems(res.items ?? []);
  };

  useEffect(() => {
    void load()
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setBody("");
    setError("");
  };

  const startEdit = (item: SmsTemplateRecord) => {
    setEditingId(item.id);
    setName(item.name);
    setBody(item.body);
    setError("");
  };

  const insertToken = (token: string) => {
    setBody((prev) => (prev ? `${prev}${prev.endsWith(" ") ? "" : " "}${token}` : token));
  };

  const save = async () => {
    if (!name.trim() || !body.trim()) {
      setError("Şablon adı ve mesaj metni zorunludur");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await smsSendService.updateTemplate(editingId, name.trim(), body.trim());
      } else {
        await smsSendService.saveTemplate(name.trim(), body.trim());
      }
      await load();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Şablon kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: SmsTemplateRecord) => {
    if (!window.confirm(`“${item.name}” şablonunu silmek istiyor musunuz?`)) return;
    try {
      await smsSendService.deleteTemplate(item.id);
      if (editingId === item.id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Şablon silinemedi");
    }
  };

  const parts = smsEncodingAndParts(body).parts;
  const preview = previewSmsTemplate(body);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SMS Şablonları</h1>
          <p className="mt-1 text-sm text-slate-500">Gönderimde kullanmak üzere mesaj şablonlarını buradan ekleyin ve düzenleyin.</p>
        </div>
        <Link href="/customer/sms">
          <Button variant="outline" className="rounded-xl">SMS Gönderim</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            {editingId ? "Şablonu düzenle" : "Yeni şablon ekle"}
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-slate-700">Şablon adı</Label>
              <input
                className="flex h-10 w-full rounded-xl border border-slate-200 px-3 text-sm shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn. Kampanya duyurusu"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-sm font-medium text-slate-700">Mesaj metni</Label>
              <Textarea
                rows={7}
                className="rounded-xl"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Sayın {yetkili}, {firma} için..."
              />
              <p className="mt-1.5 text-right text-xs text-slate-500">
                Karakter {body.length} · {parts} SMS
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {VARIABLES.map((token) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => insertToken(token)}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700 hover:bg-slate-200"
                >
                  {token}
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button className="h-10 rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-700" disabled={saving} onClick={() => void save()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? "Güncelle" : "Şablon ekle"}
              </Button>
              {editingId && (
                <Button variant="outline" className="h-10 rounded-xl" onClick={resetForm}>Vazgeç</Button>
              )}
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Önizleme</h2>
          <p className="min-h-24 whitespace-pre-wrap rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {preview || "Mesajınız burada görünecek."}
          </p>
        </aside>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        {items.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-500">Henüz şablon yok. Soldan yeni şablon ekleyin.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.body}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="outline" size="icon" className="rounded-lg" onClick={() => startEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-lg text-red-600 hover:bg-red-50" onClick={() => void remove(item)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
