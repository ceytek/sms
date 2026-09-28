"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Check,
  Clock3,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  smsSendService,
  type SmsCampaignListItem,
  type SmsCampaignReportSummary,
} from "../services/sms-send.service";

const STATUS_OPTIONS = [
  { value: "ALL", label: "Tümü" },
  { value: "DRAFT", label: "Taslak" },
  { value: "PROCESSING", label: "Beklemede" },
  { value: "SENT", label: "İletildi" },
  { value: "FAILED", label: "İletilemedi" },
  { value: "CANCELLED", label: "İptal" },
];

const EMPTY_SUMMARY: SmsCampaignReportSummary = {
  campaigns: 0,
  recipients: 0,
  delivered: 0,
  failed: 0,
  pending: 0,
  campaignDelta: 0,
  recipientDelta: 0,
};

export function SmsCampaignListPage() {
  const [items, setItems] = useState<SmsCampaignListItem[]>([]);
  const [summary, setSummary] = useState<SmsCampaignReportSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ search: "", status: "ALL", from: "", to: "" });

  useEffect(() => {
    let active = true;
    setLoading(true);
    void smsSendService
      .list({ page, limit, ...applied })
      .then((res) => {
        if (!active) return;
        setItems(res.items ?? []);
        setSummary(res.summary ?? EMPTY_SUMMARY);
        setTotal(res.meta?.total ?? 0);
        setTotalPages(res.meta?.totalPages ?? 1);
      })
      .catch(() => {
        if (!active) return;
        setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, limit, applied]);

  const applyFilters = () => {
    setPage(1);
    setApplied({ search: search.trim(), status, from, to });
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setFrom("");
    setTo("");
    setPage(1);
    setApplied({ search: "", status: "ALL", from: "", to: "" });
  };

  const fromRow = total === 0 ? 0 : (page - 1) * limit + 1;
  const toRow = Math.min(total, page * limit);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">SMS Gönderimleri</h1>
          <p className="mt-1 text-sm text-slate-500">Tüm SMS gönderimlerinizi görüntüleyin ve raporlarını takip edin.</p>
        </div>
        <Link href="/customer/sms/new">
          <Button className="rounded-xl bg-slate-900 px-4 text-white hover:bg-slate-800">
            <Plus className="mr-1.5 h-4 w-4" /> Yeni gönderim
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={<Send className="h-4 w-4" />}
          iconClass="bg-blue-50 text-blue-600"
          label="Toplam Gönderim"
          value={formatCount(summary.campaigns)}
          delta={summary.campaignDelta}
          deltaLabel="geçen aya göre"
        />
        <StatCard
          icon={<Users className="h-4 w-4" />}
          iconClass="bg-violet-50 text-violet-600"
          label="Toplam Alıcı"
          value={formatCount(summary.recipients)}
          delta={summary.recipientDelta}
          deltaLabel="geçen aya göre"
        />
        <RateCard
          icon={<Check className="h-4 w-4" />}
          iconClass="bg-emerald-50 text-emerald-600"
          label="Teslim edildi"
          value={formatCount(summary.delivered)}
          rate={rate(summary.delivered, summary.recipients)}
          rateLabel="teslim oranı"
          color="#10b981"
        />
        <RateCard
          icon={<X className="h-4 w-4" />}
          iconClass="bg-rose-50 text-rose-600"
          label="İletilemedi"
          value={formatCount(summary.failed)}
          rate={rate(summary.failed, summary.recipients)}
          rateLabel="hata oranı"
          color="#f43f5e"
        />
        <RateCard
          icon={<Clock3 className="h-4 w-4" />}
          iconClass="bg-amber-50 text-amber-600"
          label="Beklemede"
          value={formatCount(summary.pending)}
          rate={rate(summary.pending, summary.recipients)}
          rateLabel="beklemede"
          color="#f59e0b"
        />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-2 lg:grid-cols-[1.4fr_0.8fr_1.3fr_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyFilters();
              }}
              placeholder="Mesaj veya başlık ara..."
              className="h-10 rounded-xl pl-9"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Durum: {option.label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="h-10 rounded-xl" />
            <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="h-10 rounded-xl" onClick={applyFilters}>
              Uygula
            </Button>
            <Button variant="outline" className="h-10 rounded-xl" onClick={clearFilters}>
              Temizle
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3">Kampanya</th>
                <th className="px-4 py-3">Mesaj</th>
                <th className="px-4 py-3">Alıcı</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">İlerleme</th>
                <th className="px-4 py-3">Oluşturulma</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-600" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                    Bu filtrede gönderim yok.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const badge = rowBadge(item);
                  const progress = rowProgress(item);
                  const created = new Date(item.createdAt);
                  return (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{item.name || item.originatorName || "SMS"}</p>
                      </td>
                      <td className="max-w-[240px] px-4 py-3 text-slate-600">
                        <p className="truncate">{item.body}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold tabular-nums text-slate-900">{formatCount(item.validRecipientCount)}</p>
                        <p className="text-xs text-slate-400">alıcı</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>
                      <td className="min-w-[160px] px-4 py-3">
                        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                          <span className="tabular-nums">
                            {formatCount(progress.done)} / {formatCount(progress.total)}
                          </span>
                          <span className="tabular-nums">%{progress.percent}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, progress.percent)}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <p>{created.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}</p>
                        <p className="text-xs text-slate-400">
                          {created.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/customer/sms/${item.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="Detay"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <p>
            {total === 0 ? "0 kayıt" : `${fromRow}–${toRow} / ${formatCount(total)} kayıt`}
          </p>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2"
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size} / sayfa
                </option>
              ))}
            </select>
            <Button variant="outline" size="sm" className="h-8 rounded-lg" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              Önceki
            </Button>
            <span className="tabular-nums">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" className="h-8 rounded-lg" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
              Sonraki
            </Button>
          </div>
        </div>
      </div>
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
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  value: string;
  delta: number;
  deltaLabel: string;
}) {
  const up = delta >= 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconClass}`}>{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className={`mt-1 text-xs font-medium ${up ? "text-emerald-600" : "text-rose-600"}`}>
        {up ? "+" : ""}%{trimNumber(delta)} {deltaLabel}
      </p>
    </div>
  );
}

function RateCard({
  icon,
  iconClass,
  label,
  value,
  rate: percent,
  rateLabel,
  color,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  value: string;
  rate: number;
  rateLabel: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconClass}`}>{icon}</span>
          {label}
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
        <p className="mt-1 text-xs text-slate-400">%{trimNumber(percent)} {rateLabel}</p>
      </div>
      <Donut percent={percent} color={color} />
    </div>
  );
}

function Donut({ percent, color }: { percent: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
      <circle cx="26" cy="26" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="5" />
      <circle
        cx="26"
        cy="26"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="30" textAnchor="middle" className="fill-slate-700 text-[10px] font-semibold">
        %{Math.round(clamped)}
      </text>
    </svg>
  );
}

function rowBadge(item: SmsCampaignListItem) {
  if (item.status === "CANCELLED") return { label: "İptal", className: "bg-slate-100 text-slate-600", icon: <X className="h-3 w-3" /> };
  if (item.status === "FAILED") return { label: "İletilemedi", className: "bg-rose-50 text-rose-700", icon: <X className="h-3 w-3" /> };
  if (["DRAFT", "READY", "PREPARING", "SCHEDULED"].includes(item.status)) {
    const label = item.status === "SCHEDULED" ? "Zamanlandı" : item.status === "PREPARING" ? "Hazırlanıyor" : item.status === "READY" ? "Hazır" : "Taslak";
    return { label, className: "bg-slate-100 text-slate-600", icon: <FileText className="h-3 w-3" /> };
  }
  if (["QUEUED", "SENDING", "PROCESSING"].includes(item.status)) {
    return { label: "Beklemede", className: "bg-amber-50 text-amber-700", icon: <Clock3 className="h-3 w-3" /> };
  }
  const total = item.validRecipientCount || 0;
  if (total > 0 && item.deliveredCount >= total) {
    return { label: "Teslim edildi", className: "bg-emerald-50 text-emerald-700", icon: <Check className="h-3 w-3" /> };
  }
  if (total > 0 && item.failCount >= total) {
    return { label: "İletilemedi", className: "bg-rose-50 text-rose-700", icon: <X className="h-3 w-3" /> };
  }
  return { label: "Kabul edildi", className: "bg-blue-50 text-blue-700", icon: <Send className="h-3 w-3" /> };
}

function rowProgress(item: SmsCampaignListItem) {
  const total = item.validRecipientCount || 0;
  const done = Math.min(total, (item.acceptedCount || 0) + (item.failCount || 0));
  const percent = total ? Math.round((done / total) * 1000) / 10 : 0;
  return { done, total, percent };
}

function rate(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

function formatCount(value: number) {
  return Number(value || 0).toLocaleString("tr-TR");
}

function trimNumber(value: number) {
  return Number(value || 0).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
}
