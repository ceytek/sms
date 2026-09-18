"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { contactGroupsService } from "../services/groups.service";
import type { ContactGroupRecord } from "../types";

export function GroupsPage() {
  const [items, setItems] = useState<ContactGroupRecord[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<ContactGroupRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await contactGroupsService.list());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gruplar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setError("");
    try {
      if (editing) await contactGroupsService.update(editing.id, { name, description });
      else await contactGroupsService.create({ name, description });
      setName("");
      setDescription("");
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Gruplar</h1>
      <p className="mb-6 text-sm text-slate-500">Grup adları veritabanında tutulur. Bir kişi birden fazla grupta olabilir.</p>
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>Grup adı</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Eczaneler" />
          </div>
          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => void save()} disabled={!name.trim()}>
            <Plus className="mr-2 h-4 w-4" />{editing ? "Güncelle" : "Grup Ekle"}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {loading && <div className="p-8 text-center text-slate-400"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></div>}
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium text-slate-900">{item.name}</p>
              <p className="text-xs text-slate-500">{item.memberCount} kişi · {item.isActive ? "Aktif" : "Pasif"}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditing(item); setName(item.name); setDescription(item.description); }}>Düzenle</Button>
              <Button size="sm" variant="outline" onClick={() => void contactGroupsService.update(item.id, { isActive: !item.isActive }).then(load)}>
                {item.isActive ? "Pasife Al" : "Aktif Yap"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void contactGroupsService.remove(item.id).then(load)}>Sil</Button>
            </div>
          </div>
        ))}
        {!loading && !items.length && <p className="p-8 text-center text-slate-400">Henüz grup yok</p>}
      </div>
    </div>
  );
}
