"use client";

import { useCallback, useEffect, useState } from "react";
import { kvkkService } from "../services/kvkk.service";
import type { KvkkDashboard } from "../types";

export function KvkkDashboardPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<KvkkDashboard | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await kvkkService.dashboard({ from: from || undefined, to: to || undefined }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dashboard yüklenemedi");
    }
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">KVKK / İzin Yönetimi</h1>
      <p className="mb-6 text-sm text-slate-500">Toplanan izinlerin özeti. SMS gönderiminden bağımsız çalışır.</p>
      <div className="mb-6 flex flex-wrap gap-3">
        <input type="date" className="h-9 rounded-md border px-3 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="h-9 rounded-md border px-3 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card label="Toplam İzin" value={data?.total ?? 0} />
        <Card label="Aktif İzin" value={data?.approved ?? 0} />
        <Card label="Bekleyen" value={data?.pending ?? 0} />
        <Card label="İptal Edilen" value={data?.cancelled ?? 0} />
        <Card label="Kısa Kod ile Gelen" value={data?.shortCode ?? 0} />
        <Card label="SMS Form ile Gelen" value={data?.smsForm ?? 0} />
        <Card label="QR ile Gelen" value={data?.qr ?? 0} />
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
