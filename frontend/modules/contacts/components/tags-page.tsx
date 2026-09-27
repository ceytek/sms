"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Clock3, Info, Loader2, MapPin, Megaphone, MoreHorizontal, Pencil, Plus, Search, Store, Tag, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contactsService } from "../services/contacts.service";
import { contactTagsService } from "../services/tags.service";
import type { ContactSummary, ContactTagRecord } from "../types";

const TAG_STYLES = [
  { icon: Tag, tone: "bg-rose-50 text-rose-600" },
  { icon: MapPin, tone: "bg-sky-50 text-sky-600" },
  { icon: User, tone: "bg-violet-50 text-violet-600" },
  { icon: Store, tone: "bg-fuchsia-50 text-fuchsia-600" },
  { icon: Megaphone, tone: "bg-amber-50 text-amber-600" },
];

type SortKey = "updated" | "name" | "members";

export function TagsPage() {
  const [items, setItems] = useState<ContactTagRecord[]>([]);
  const [summary, setSummary] = useState<ContactSummary | null>(null);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<ContactTagRecord | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("updated");
  const [menuId, setMenuId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tags, nextSummary] = await Promise.all([
        contactTagsService.list(),
        contactsService.summary().catch(() => null),
      ]);
      setItems(tags);
      setSummary(nextSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Etiketler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      if (editing) await contactTagsService.update(editing.id, { name: name.trim() });
      else await contactTagsService.create({ name: name.trim() });
      setName("");
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr-TR");
    const filtered = items.filter((item) => !q || item.name.toLocaleLowerCase("tr-TR").includes(q));
    return filtered.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "tr");
      if (sort === "members") return b.memberCount - a.memberCount;
      return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    });
  }, [items, query, sort]);

  const tagDelta = useMemo(() => monthCountDelta(items.map((item) => item.createdAt)), [items]);
  const peopleDelta = monthDelta(summary?.taggedThisMonth ?? 0, summary?.taggedPrevMonth ?? 0);
  const latest = items.reduce<string | undefined>((best, item) => {
    const stamp = item.updatedAt || item.createdAt;
    if (!stamp) return best;
    if (!best || new Date(stamp).getTime() > new Date(best).getTime()) return stamp;
    return best;
  }, undefined);
  const fresh = latest ? Date.now() - new Date(latest).getTime() < 1000 * 60 * 60 * 24 * 14 : false;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Etiketler</h1>
      <p className="mt-1 text-sm text-slate-500">Etiketler gruptan bağımsızdır. Örnek: Ankara, VIP, Yeni Müşteri.</p>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <StatCard
          icon={<Tag className="h-4 w-4" />}
          iconClass="bg-blue-50 text-blue-600"
          label="Toplam etiket"
          value={String(items.length)}
          delta={tagDelta}
          deltaLabel="geçen aya göre"
          deltaKind="count"
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          iconClass="bg-emerald-50 text-emerald-600"
          label="Etiketli kişi"
          value={formatCount(summary?.taggedContacts ?? 0)}
          delta={peopleDelta}
          deltaLabel="geçen aya göre"
          deltaKind="percent"
        />
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Clock3 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs text-slate-500">Son güncelleme</p>
              <p className="text-sm font-semibold text-slate-900">{latest ? formatStamp(latest) : "—"}</p>
            </div>
          </div>
          {fresh && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Güncel
            </span>
          )}
        </div>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Plus className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{editing ? "Etiketi düzenle" : "Yeni Etiket Ekle"}</h2>
            <p className="text-xs text-slate-500">Yeni bir etiket oluşturarak kişileri daha kolay segmentleyebilirsiniz.</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Etiket adı <span className="text-rose-500">*</span>
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. VIP" className="h-10 rounded-xl" />
          </div>
          <div className="flex gap-2">
            {editing && (
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl"
                onClick={() => {
                  setEditing(null);
                  setName("");
                }}
              >
                Vazgeç
              </Button>
            )}
            <Button className="h-10 rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-700" onClick={() => void save()} disabled={!name.trim() || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
              {editing ? "Güncelle" : "Etiket Ekle"}
            </Button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Etiketler</h2>
            <p className="text-xs text-slate-500">Oluşturduğunuz etiketleri görüntüleyebilir, düzenleyebilir ve yönetebilirsiniz.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Etiket ara..."
                className="h-10 w-52 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400"
              />
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
            >
              <option value="updated">Son güncellenen</option>
              <option value="name">Ada göre</option>
              <option value="members">Kullanım sayısı</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Etiket adı</th>
                <th className="px-3 py-3 font-medium">Kullanım sayısı</th>
                <th className="px-3 py-3 font-medium">Son güncelleme</th>
                <th className="px-5 py-3 text-right font-medium">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </td>
                </tr>
              )}
              {!loading && visible.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-slate-400">
                    Henüz etiket yok
                  </td>
                </tr>
              )}
              {!loading &&
                visible.map((item, index) => {
                  const style = TAG_STYLES[index % TAG_STYLES.length];
                  const Icon = style.icon;
                  return (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${style.tone}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="font-medium text-slate-900">{item.name}</span>
                          {!item.isActive && <span className="text-xs text-slate-400">Pasif</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {formatCount(item.memberCount)} kişi
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500">{item.updatedAt || item.createdAt ? formatStamp(item.updatedAt || item.createdAt || "") : "—"}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(item);
                              setName(item.name);
                              setMenuId(null);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Düzenle
                          </button>
                          <Link href={`/customer/contacts?tagId=${item.id}`} className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100">
                            <Users className="h-3.5 w-3.5" />
                            Kişileri Gör
                          </Link>
                          <div className="relative">
                            <button type="button" onClick={() => setMenuId(menuId === item.id ? null : item.id)} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {menuId === item.id && (
                              <div className="absolute right-0 z-10 mt-1 w-36 rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
                                <button
                                  type="button"
                                  className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                                  onClick={() => {
                                    setMenuId(null);
                                    void contactTagsService.update(item.id, { isActive: !item.isActive }).then(load);
                                  }}
                                >
                                  {item.isActive ? "Pasife Al" : "Aktif Yap"}
                                </button>
                                <button
                                  type="button"
                                  className="block w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
                                  onClick={() => {
                                    setMenuId(null);
                                    void contactTagsService.remove(item.id).then(load);
                                  }}
                                >
                                  Sil
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <div className="m-4 flex gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <p>
            <span className="font-medium text-slate-800">Bilgi. </span>
            Bir kişiye birden fazla etiket atanabilir. Etiketler, kişileri daha kolay segmentlemek ve hedefli iletişim kurmak için kullanılabilir.
          </p>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  iconClass,
  label,
  value,
  delta,
  deltaLabel,
  deltaKind,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  value: string;
  delta: number;
  deltaLabel: string;
  deltaKind: "count" | "percent";
}) {
  const up = delta >= 0;
  const text = deltaKind === "percent" ? `${up ? "+" : ""}${delta}%` : `${up ? "+" : ""}${delta}`;
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>{icon}</span>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-2xl font-bold tabular-nums text-slate-900">{value}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${up ? "text-emerald-600" : "text-rose-600"}`}>{text}</p>
        <p className="text-[11px] text-slate-400">{deltaLabel}</p>
      </div>
    </div>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
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

function monthDelta(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function monthCountDelta(stamps: Array<string | undefined>) {
  const now = new Date();
  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  let current = 0;
  let previous = 0;
  for (const stamp of stamps) {
    if (!stamp) continue;
    const time = new Date(stamp).getTime();
    if (time >= thisStart) current += 1;
    else if (time >= prevStart && time < thisStart) previous += 1;
  }
  return current - previous;
}
