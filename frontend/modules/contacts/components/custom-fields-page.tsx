"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Hash, Info, Loader2, Pencil, Plus, Search, Trash2, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contactCustomFieldsService } from "../services/custom-fields.service";
import type { ContactCustomFieldRecord, ContactCustomFieldType } from "../types";
import { MAX_CONTACT_CUSTOM_FIELDS } from "../types";

const FIELD_TYPES: { value: ContactCustomFieldType; label: string }[] = [
  { value: "TEXT", label: "Metin" },
  { value: "DATE", label: "Tarih" },
  { value: "NUMBER", label: "Sayı" },
];

const TYPE_META: Record<ContactCustomFieldType, { label: string; className: string; icon: typeof Type }> = {
  TEXT: { label: "Metin", className: "bg-slate-100 text-slate-700", icon: Type },
  DATE: { label: "Tarih", className: "bg-violet-50 text-violet-700", icon: Calendar },
  NUMBER: { label: "Sayı", className: "bg-amber-50 text-amber-700", icon: Hash },
};

export function CustomFieldsPage() {
  const [items, setItems] = useState<ContactCustomFieldRecord[]>([]);
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<ContactCustomFieldType>("TEXT");
  const [editing, setEditing] = useState<ContactCustomFieldRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const atLimit = items.length >= MAX_CONTACT_CUSTOM_FIELDS && !editing;
  const TypeIcon = TYPE_META[fieldType].icon;

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

  useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setName("");
    setFieldType("TEXT");
    setEditing(null);
  };

  const save = async () => {
    if (!name.trim() || atLimit) return;
    setSaving(true);
    setError("");
    try {
      if (editing) await contactCustomFieldsService.update(editing.id, { name: name.trim(), fieldType });
      else await contactCustomFieldsService.create({ name: name.trim(), fieldType });
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return items.filter((item) => !q || item.name.toLocaleLowerCase("tr-TR").includes(q));
  }, [items, query]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Özel Alanlar</h1>
          <p className="mt-1 text-sm text-slate-500">
            Rehber kişilerine en fazla {MAX_CONTACT_CUSTOM_FIELDS} özel alan ekleyebilirsiniz. Örnek: Doğum günü tarihi.
          </p>
        </div>
        <div className="flex max-w-sm gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <p>Özel alanlar, rehberdeki kişilere ait ek bilgilerinizi kategorize ederek saklamanızı sağlar.</p>
        </div>
      </div>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Plus className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{editing ? "Özel alanı düzenle" : "Yeni özel alan ekle"}</h2>
            <p className="text-xs text-slate-500">Rehber kişilerinize saklamak istediğiniz ek bilgiyi tanımlayın.</p>
          </div>
        </div>
        <div className="grid items-end gap-3 lg:grid-cols-[1fr_220px_auto]">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Alan adı <span className="text-rose-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Doğum günü tarihi, Şehir, Müşteri kodu..."
              className="h-11 rounded-xl"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Tür <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <TypeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <select
                value={fieldType}
                onChange={(e) => setFieldType(e.target.value as ContactCustomFieldType)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-800 outline-none focus:border-blue-400"
              >
                {FIELD_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            {editing && (
              <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={reset}>
                Vazgeç
              </Button>
            )}
            <Button className="h-11 rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-700" onClick={() => void save()} disabled={!name.trim() || atLimit || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
              {editing ? "Güncelle" : "Alan Ekle"}
            </Button>
          </div>
        </div>
        {atLimit && <p className="mt-3 text-sm text-amber-700">En fazla {MAX_CONTACT_CUSTOM_FIELDS} özel alan eklenebilir.</p>}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Type className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Özel alanlar</h2>
              <p className="text-xs text-slate-500">
                Toplam {items.length} özel alan · En fazla {MAX_CONTACT_CUSTOM_FIELDS} alan ekleyebilirsiniz.
              </p>
            </div>
          </div>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Alan adı ara..."
              className="h-10 w-52 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-3 py-3 font-medium">Alan adı</th>
                <th className="px-3 py-3 font-medium">Tür</th>
                <th className="px-3 py-3 font-medium">Eklenme tarihi</th>
                <th className="px-5 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              )}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                    Henüz özel alan yok
                  </td>
                </tr>
              )}
              {!loading &&
                visible.map((item) => {
                  const meta = TYPE_META[item.fieldType];
                  const Icon = meta.icon;
                  const order = items.findIndex((row) => row.id === item.id) + 1;
                  return (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-5 py-3 text-slate-400">{order}</td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-400">{meta.label}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}>
                          <Icon className="h-3.5 w-3.5" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500">{item.createdAt ? formatStamp(item.createdAt) : "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(item);
                              setName(item.name);
                              setFieldType(item.fieldType);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Düzenle
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void contactCustomFieldsService.remove(item.id).then(() => {
                                if (editing?.id === item.id) reset();
                                return load();
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-100 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function formatStamp(value: string) {
  return new Date(value).toLocaleString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
