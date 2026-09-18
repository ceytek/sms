"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { contactTagsService } from "../services/tags.service";
import type { ContactTagRecord } from "../types";

export function TagsPage() {
  const [items, setItems] = useState<ContactTagRecord[]>([]);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<ContactTagRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await contactTagsService.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Etiketler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setError("");
    try {
      if (editing) await contactTagsService.update(editing.id, { name });
      else await contactTagsService.create({ name });
      setName("");
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Etiketler</h1>
      <p className="mb-6 text-sm text-slate-500">Etiketler gruptan bağımsızdır. Örnek: Ankara, VIP, Yeni Müşteri.</p>
      <div className="mb-6 flex items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex-1 space-y-1.5">
          <Label>Etiket adı</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VIP" />
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => void save()} disabled={!name.trim()}>
          <Plus className="mr-2 h-4 w-4" />{editing ? "Güncelle" : "Etiket Ekle"}
        </Button>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {loading && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm">
            <span className="font-medium">{item.name}</span>
            <span className="text-xs text-slate-400">{item.memberCount}</span>
            <button className="text-xs text-blue-600" onClick={() => { setEditing(item); setName(item.name); }}>Düzenle</button>
            <button className="text-xs text-slate-400" onClick={() => void contactTagsService.remove(item.id).then(load)}>Sil</button>
          </div>
        ))}
        {!loading && !items.length && <p className="text-sm text-slate-400">Henüz etiket yok</p>}
      </div>
    </div>
  );
}
