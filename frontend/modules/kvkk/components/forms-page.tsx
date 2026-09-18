"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { kvkkService } from "../services/kvkk.service";
import type { KvkkFormRecord } from "../types";

export function KvkkFormsPage() {
  const [items, setItems] = useState<KvkkFormRecord[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setItems(await kvkkService.listForms());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Formlar yüklenemedi");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">KVKK Formları</h1>
          <p className="text-sm text-slate-500">Oluşturulan formlar listelenir. Düzenle ile içeriği değiştirirsiniz.</p>
        </div>
        <Link href="/customer/kvkk/consent-forms/new">
          <Button className="bg-blue-600 hover:bg-blue-700">Yeni Form</Button>
        </Link>
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Form adı</th>
              <th className="px-4 py-3 font-medium">Başlık</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Onay kutusu</th>
              <th className="px-4 py-3 font-medium">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                <td className="px-4 py-3 text-slate-600">{item.title}</td>
                <td className="px-4 py-3">{item.isActive ? "Aktif" : "Pasif"}</td>
                <td className="px-4 py-3">{item.checkboxes.length}</td>
                <td className="px-4 py-3">
                  <Link href={`/customer/kvkk/consent-forms/${item.id}`}>
                    <Button type="button" variant="outline" size="sm">Düzenle</Button>
                  </Link>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-400" colSpan={5}>Henüz form yok</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
