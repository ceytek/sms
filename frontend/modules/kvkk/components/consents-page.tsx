"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { kvkkService } from "../services/kvkk.service";
import type { KvkkConsentListItem, KvkkConsentMethod, KvkkConsentStatus } from "../types";
import { KVKK_METHOD_LABELS, KVKK_STATUS_LABELS, selectClass } from "../types";

export function KvkkConsentsPage() {
  const [items, setItems] = useState<KvkkConsentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<KvkkConsentStatus | "ALL">("ALL");
  const [method, setMethod] = useState<KvkkConsentMethod | "ALL">("ALL");
  const [error, setError] = useState("");
  const limit = 20;

  const load = useCallback(async () => {
    try {
      const result = await kvkkService.listConsents({ search, status, method, page, limit });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıtlar yüklenemedi");
    }
  }, [search, status, method, page]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">İzin Kayıtları</h1>
      <p className="mb-6 text-sm text-slate-500">Kısa kod, SMS form ve QR ile gelen tüm izinler.</p>
      <div className="mb-4 flex flex-wrap gap-2">
        <input className="h-9 min-w-[200px] flex-1 rounded-md border px-3 text-sm" placeholder="Ad, telefon ara" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select className={`${selectClass} w-40`} value={status} onChange={(e) => { setStatus(e.target.value as KvkkConsentStatus | "ALL"); setPage(1); }}>
          <option value="ALL">Tüm durumlar</option>
          {Object.entries(KVKK_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className={`${selectClass} w-40`} value={method} onChange={(e) => { setMethod(e.target.value as KvkkConsentMethod | "ALL"); setPage(1); }}>
          <option value="ALL">Tüm yöntemler</option>
          {Object.entries(KVKK_METHOD_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Ad Soyad</th>
              <th className="px-4 py-3 font-medium">Telefon</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Yöntem</th>
              <th className="px-4 py-3 font-medium">Form</th>
              <th className="px-4 py-3 font-medium">Metin</th>
              <th className="px-4 py-3 font-medium">Tarih</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <Link href={`/customer/kvkk/consents/${item.id}`} className="font-medium text-blue-600">{item.firstName} {item.lastName}</Link>
                </td>
                <td className="px-4 py-3">{item.formattedPhone || item.mobilePhone}</td>
                <td className="px-4 py-3">{KVKK_STATUS_LABELS[item.status]}</td>
                <td className="px-4 py-3">{KVKK_METHOD_LABELS[item.method]}</td>
                <td className="px-4 py-3">{item.formName || "-"}</td>
                <td className="px-4 py-3">{item.textVersionNumber ? `v${item.textVersionNumber}` : "-"}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(item.createdAt).toLocaleString("tr-TR")}</td>
              </tr>
            ))}
            {!items.length && <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={7}>Kayıt yok</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>Toplam {total}</span>
        <div className="flex gap-2">
          <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Önceki</button>
          <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page * limit >= total} onClick={() => setPage((value) => value + 1)}>Sonraki</button>
        </div>
      </div>
    </div>
  );
}
