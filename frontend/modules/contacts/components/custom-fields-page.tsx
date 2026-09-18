"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { contactCustomFieldsService } from "../services/custom-fields.service";
import type { ContactCustomFieldRecord, ContactCustomFieldType } from "../types";
import { MAX_CONTACT_CUSTOM_FIELDS, selectClass } from "../types";

const FIELD_TYPE_OPTIONS: { value: ContactCustomFieldType; label: string }[] = [
  { value: "TEXT", label: "Metin" },
  { value: "DATE", label: "Tarih" },
  { value: "NUMBER", label: "Sayı" },
];

const FIELD_TYPE_LABELS: Record<ContactCustomFieldType, string> = {
  TEXT: "Metin",
  DATE: "Tarih",
  NUMBER: "Sayı",
};

export function CustomFieldsPage() {
  const [items, setItems] = useState<ContactCustomFieldRecord[]>([]);
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<ContactCustomFieldType>("TEXT");
  const [editing, setEditing] = useState<ContactCustomFieldRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const atLimit = items.length >= MAX_CONTACT_CUSTOM_FIELDS && !editing;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await contactCustomFieldsService.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Özel alanlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const reset = () => {
    setName("");
    setFieldType("TEXT");
    setEditing(null);
  };

  const save = async () => {
    setError("");
    try {
      if (editing) await contactCustomFieldsService.update(editing.id, { name, fieldType });
      else await contactCustomFieldsService.create({ name, fieldType });
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Özel Alanlar</h1>
      <p className="mb-6 text-sm text-slate-500">
        Rehber kişilerine en fazla {MAX_CONTACT_CUSTOM_FIELDS} özel alan ekleyebilirsiniz. Örnek: Doğum günü tarihi.
      </p>
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="min-w-[220px] flex-1 space-y-1.5">
          <Label>Alan adı</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Doğum günü tarihi" />
        </div>
        <div className="w-40 space-y-1.5">
          <Label>Tür</Label>
          <select className={selectClass} value={fieldType} onChange={(e) => setFieldType(e.target.value as ContactCustomFieldType)}>
            {FIELD_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => void save()} disabled={!name.trim() || atLimit}>
          <Plus className="mr-2 h-4 w-4" />{editing ? "Güncelle" : "Alan Ekle"}
        </Button>
        {editing && (
          <Button variant="outline" onClick={reset}>Vazgeç</Button>
        )}
      </div>
      {atLimit && <p className="mb-4 text-sm text-amber-700">En fazla {MAX_CONTACT_CUSTOM_FIELDS} özel alan eklenebilir.</p>}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="space-y-2">
        {loading && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
        {items.map((item, index) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="font-medium text-slate-900">{item.name}</p>
              <p className="text-xs text-slate-500">{FIELD_TYPE_LABELS[item.fieldType]} · {index + 1}/{MAX_CONTACT_CUSTOM_FIELDS}</p>
            </div>
            <div className="flex gap-3 text-sm">
              <button className="text-blue-600" onClick={() => { setEditing(item); setName(item.name); setFieldType(item.fieldType); }}>Düzenle</button>
              <button
                className="text-slate-400"
                onClick={() => void contactCustomFieldsService.remove(item.id).then(() => { if (editing?.id === item.id) reset(); return load(); })}
              >
                Sil
              </button>
            </div>
          </div>
        ))}
        {!loading && !items.length && <p className="text-sm text-slate-400">Henüz özel alan yok</p>}
      </div>
    </div>
  );
}
