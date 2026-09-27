"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Clock3,
  FileText,
  List,
  MessageSquare,
  QrCode,
  RefreshCw,
  X,
} from "lucide-react";
import { kvkkService } from "../services/kvkk.service";
import type { KvkkDashboard } from "../types";

const CARDS: {
  key: keyof KvkkDashboard;
  label: string;
  hint: string;
  icon: typeof FileText;
  iconClass: string;
  barClass: string;
}[] = [
  {
    key: "total",
    label: "Toplam İzin",
    hint: "Seçilen dönemde toplanan toplam izin sayısı.",
    icon: FileText,
    iconClass: "bg-blue-50 text-blue-600",
    barClass: "bg-blue-500",
  },
  {
    key: "approved",
    label: "Aktif İzin",
    hint: "Şu anda aktif ve kullanılabilir izinler.",
    icon: Check,
    iconClass: "bg-emerald-50 text-emerald-600",
    barClass: "bg-emerald-500",
  },
  {
    key: "pending",
    label: "Bekleyen",
    hint: "Onay sürecinde olan izinler.",
    icon: Clock3,
    iconClass: "bg-amber-50 text-amber-600",
    barClass: "bg-amber-500",
  },
  {
    key: "cancelled",
    label: "İptal Edilen",
    hint: "Kullanıcı tarafından iptal edilen izinler.",
    icon: X,
    iconClass: "bg-rose-50 text-rose-600",
    barClass: "bg-rose-500",
  },
  {
    key: "shortCode",
    label: "Kısa Kod ile Gelen",
    hint: "Kısa kod (SMS) ile toplanan izinler.",
    icon: MessageSquare,
    iconClass: "bg-violet-50 text-violet-600",
    barClass: "bg-violet-500",
  },
  {
    key: "smsForm",
    label: "SMS Form ile Gelen",
    hint: "Web form/SMS form ile toplanan izinler.",
    icon: List,
    iconClass: "bg-sky-50 text-sky-600",
    barClass: "bg-sky-500",
  },
  {
    key: "qr",
    label: "QR ile Gelen",
    hint: "QR kod ile toplanan izinler.",
    icon: QrCode,
    iconClass: "bg-indigo-50 text-indigo-600",
    barClass: "bg-indigo-500",
  },
];

export function KvkkDashboardPage() {
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<KvkkDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await kvkkService.dashboard({ from: from || undefined, to: to || undefined }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dashboard yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = data?.total ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">KVKK / İzin Yönetimi</h1>
          <p className="mt-1 text-sm text-slate-500">Toplanan izinlerin özeti. SMS gönderiminden bağımsız çalışır.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <DateField label="Başlangıç tarihi" value={draftFrom} onChange={setDraftFrom} />
          <span className="pb-2 text-slate-300">→</span>
          <DateField label="Bitiş tarihi" value={draftTo} onChange={setDraftTo} />
          <button
            type="button"
            onClick={() => {
              if (draftFrom === from && draftTo === to) {
                void load();
                return;
              }
              setFrom(draftFrom);
              setTo(draftTo);
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Güncelle
          </button>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARDS.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            hint={card.hint}
            value={data?.[card.key] ?? 0}
            total={card.key === "total" ? total : total}
            shareOfTotal={card.key !== "total"}
            icon={card.icon}
            iconClass={card.iconClass}
            barClass={card.barClass}
          />
        ))}
      </div>
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-500">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400"
      />
    </label>
  );
}

function StatCard({
  label,
  hint,
  value,
  total,
  shareOfTotal,
  icon: Icon,
  iconClass,
  barClass,
}: {
  label: string;
  hint: string;
  value: number;
  total: number;
  shareOfTotal: boolean;
  icon: typeof FileText;
  iconClass: string;
  barClass: string;
}) {
  const percent = !total ? 0 : shareOfTotal ? Math.round((value / total) * 100) : 100;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span title={hint} className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[11px] text-slate-400">
          ?
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value.toLocaleString("tr-TR")}</p>
      <p className="mt-1 text-xs text-slate-400">{hint}</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${barClass}`} style={{ width: `${percent}%` }} />
        </div>
        <span className="text-xs text-slate-400">%{percent}</span>
      </div>
    </div>
  );
}
