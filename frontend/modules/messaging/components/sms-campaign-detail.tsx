"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock3,
  Coins,
  Copy,
  Download,
  Loader2,
  Send,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { smsSendService, type SmsCampaignProgress } from "../services/sms-send.service";
import { campaignStatusLabel, recipientStatusLabel } from "../sms-status-labels";

type RecipientRow = {
  id: string;
  mobile?: string;
  name?: string;
  status: string;
  excludeReason?: string;
  lastError?: string;
  actedAt?: string | null;
};

const AUDIENCE_LABELS: Record<string, string> = {
  MANUAL_NUMBERS: "Manuel numaralar",
  FILE_IMPORT: "Dosya",
  CONTACT_BOOK: "Rehber",
  CONTACT_GROUP: "Grup",
  CUSTOMER_CATEGORY: "Kategori",
  MIXED: "Karma",
};

const SEND_TYPE_LABELS: Record<string, string> = {
  CUSTOMER_TO_RECIPIENTS: "Toplu SMS",
  DEALER_TO_CUSTOMERS: "Bayi gönderimi",
};

const CATEGORY_LABELS: Record<string, string> = {
  DUYURU: "Duyuru",
  BILGILENDIRME: "Bilgilendirme",
  HATIRLATMA: "Hatırlatma",
  KAMPANYA: "Kampanya",
  DIGER: "Diğer",
};

const COMPOSITION_LABELS: Record<string, string> = {
  BULK: "Toplu SMS",
  SINGLE: "Tekil SMS",
  PERSONALIZED: "Kişiselleştirilmiş SMS",
  SCHEDULED: "Planlı Gönderim",
};

export function SmsCampaignDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const [data, setData] = useState<SmsCampaignProgress | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<RecipientRow[]>([]);
  const [rowTotal, setRowTotal] = useState(0);
  const [rowPages, setRowPages] = useState(1);
  const limit = 10;

  const load = async () => {
    const progress = await smsSendService.progress(id);
    setData(progress);
  };

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "Yüklenemedi"));
    const inflight =
      data &&
      ((data.queuedCount || 0) > 0 ||
        (data.processingCount || 0) > 0 ||
        ["QUEUED", "PROCESSING", "SENDING"].includes(data.status));
    const timer = window.setInterval(() => void load().catch(() => undefined), inflight ? 1200 : 4000);
    return () => window.clearInterval(timer);
  }, [id, data?.queuedCount, data?.processingCount, data?.status]);

  useEffect(() => {
    void smsSendService
      .recipients(id, undefined, page, limit)
      .then((res) => {
        setRows(res.items ?? []);
        setRowTotal(res.meta?.total ?? 0);
        setRowPages(res.meta?.totalPages ?? 1);
      })
      .catch(() => setRows([]));
  }, [id, page, data?.status, data?.acceptedCount, data?.deliveredCount, data?.failCount, data?.queuedCount]);

  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const ready = Boolean(data.preparedAt);
  const estimated = data.actualUnits || data.validRecipientCount * (data.smsParts || 1);
  const creditShort = estimated > Number(data.walletBalance || 0);
  const canConfirm =
    ready &&
    ["READY", "DRAFT"].includes(data.status) &&
    !data.confirmedAt &&
    data.validRecipientCount > 0 &&
    !creditShort;
  const pending = (data.queuedCount || 0) + (data.processingCount || 0);
  const delivered = data.deliveredCount || 0;
  const acceptedOnly = Math.max(0, (data.acceptedCount || 0) - delivered);
  const other =
    (data.duplicateCount || 0) +
    (data.excludedCount || 0) +
    (data.consentExcludedCount || 0) +
    (data.passiveCount || 0);
  const allDelivered = data.validRecipientCount > 0 && delivered >= data.validRecipientCount;
  const slices = [
    { label: "Teslim edildi", value: delivered, color: "#10b981", dot: "bg-emerald-500" },
    { label: "Kabul edildi", value: acceptedOnly, color: "#2563eb", dot: "bg-blue-600" },
    { label: "Beklemede", value: pending, color: "#3b82f6", dot: "bg-blue-500" },
    { label: "İletilemedi", value: data.failCount || 0, color: "#f97316", dot: "bg-orange-500" },
    { label: "Geçersiz", value: data.invalidCount || 0, color: "#ef4444", dot: "bg-red-500" },
    { label: "Diğer", value: other, color: "#94a3b8", dot: "bg-slate-400" },
  ];
  const donutTotal = slices.reduce((sum, item) => sum + item.value, 0) || data.rawRecipientCount || 0;
  const title = data.name || data.originatorName || "SMS";
  const created = data.createdAt ? new Date(data.createdAt) : null;
  const fromRow = rowTotal === 0 ? 0 : (page - 1) * limit + 1;
  const toRow = Math.min(rowTotal, page * limit);

  const copyBody = async () => {
    await navigator.clipboard.writeText(data.body);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const repeat = async () => {
    const res = await smsSendService.recipients(id, undefined, 1, 100);
    const phones = (res.items ?? []).map((row) => row.mobile).filter((phone): phone is string => Boolean(phone));
    sessionStorage.setItem(
      "sms-repeat",
      JSON.stringify({ originatorId: data.originatorId, body: data.body, phones }),
    );
    router.push("/customer/sms/new");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link
            href="/customer/sms"
            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(data.status)}`}>
                <Check className="h-3 w-3" />
                {allDelivered ? "Teslim edildi" : campaignStatusLabel(data.status)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {created
                ? `Oluşturulma: ${created.toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
                : "Kampanya"}
              {data.kvkkCheckEnabled ? " · KVKK izin kontrolü açık" : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl bg-white" onClick={() => void copyBody()}>
            <Copy className="mr-1.5 h-4 w-4" />
            {copied ? "Kopyalandı" : "Kopyala"}
          </Button>
          <Button className="rounded-xl bg-slate-900 text-white hover:bg-slate-800" onClick={() => void repeat()}>
            <Send className="mr-1.5 h-4 w-4" />
            Aynı kampanyayla gönder
          </Button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {data.lastError && (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{data.lastError}</p>
      )}
      {ready && creditShort && !data.confirmedAt && (
        <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {estimated} SMS için {estimated} kredi gerekir. Bakiyeniz {data.walletBalance}. Gönderim yapılmaz.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Kampanya Bilgileri</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <Info label="Kampanya adı" value={data.name || "—"} />
            <Info label="Kategori" value={CATEGORY_LABELS[data.category || ""] || "—"} />
            <Info label="Gönderen başlığı" value={data.originatorName || "—"} />
            <Info label="Mesaj" value={data.personalized || data.composition === "PERSONALIZED" ? "Kişiselleştirilmiş" : "Serbest metin"} />
            <Info label="Gönderim türü" value={COMPOSITION_LABELS[data.composition || ""] || SEND_TYPE_LABELS[data.sendType || ""] || "Toplu SMS"} />
            <Info label="Alıcı kaynağı" value={AUDIENCE_LABELS[data.audienceSource || ""] || "—"} />
            <Info
              label="Gönderim zamanı"
              value={
                data.scheduledAt
                  ? new Date(data.scheduledAt).toLocaleString("tr-TR")
                  : data.confirmedAt
                    ? "Hemen gönderildi"
                    : "Henüz gönderilmedi"
              }
            />
          </dl>
          <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-400">Mesaj içeriği</p>
            <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-900">{data.body || "—"}</p>
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Alıcılar</p>
                <p className="text-xs text-slate-500">Bu kampanyaya eklenen alıcılar.</p>
              </div>
              <Button variant="outline" className="rounded-xl" onClick={() => void smsSendService.exportCsv(id)}>
                <Download className="mr-1.5 h-4 w-4" />
                CSV indir
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Telefon Numarası</th>
                    <th className="px-3 py-2 font-medium">Durum</th>
                    <th className="px-3 py-2 font-medium">İşlem Zamanı</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                        Alıcı yok.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-3 py-3 text-slate-400">{fromRow + index}</td>
                        <td className="px-3 py-3 font-medium text-slate-800">{row.mobile || row.name || "—"}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusTone(row.status)}`}>
                            {row.status === "QUEUED" || row.status === "PROCESSING" ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                            {row.excludeReason ? reasonLabel(row.excludeReason) : recipientStatusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-500">
                          {row.actedAt
                            ? new Date(row.actedAt).toLocaleString("tr-TR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                          {row.lastError ? <p className="text-xs text-rose-600">{row.lastError}</p> : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <p>{rowTotal === 0 ? "0 alıcı" : `Toplam ${rowTotal} alıcıdan ${fromRow}–${toRow} arası`}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-lg" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                  Önceki
                </Button>
                <span className="tabular-nums">{page}</span>
                <Button variant="outline" size="sm" className="h-8 rounded-lg" disabled={page >= rowPages} onClick={() => setPage((value) => value + 1)}>
                  Sonraki
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {canConfirm && (
              <Button
                disabled={busy}
                className="rounded-xl"
                onClick={() => {
                  setBusy(true);
                  void smsSendService
                    .confirm(id)
                    .then(load)
                    .catch((err) => setError(err instanceof Error ? err.message : "Onaylanamadı"))
                    .finally(() => setBusy(false));
                }}
              >
                Gönderimi onayla
              </Button>
            )}
            {data.status !== "CANCELLED" && data.status !== "COMPLETED" && data.status !== "FAILED" && (
              <Button
                variant="outline"
                disabled={busy}
                className="rounded-xl"
                onClick={() => {
                  setBusy(true);
                  void smsSendService.cancel(id).then(load).finally(() => setBusy(false));
                }}
              >
                İptal
              </Button>
            )}
            {(data.failCount || 0) > 0 && (
              <Button variant="outline" className="rounded-xl" onClick={() => void smsSendService.retry(id).then(load)}>
                Başarısızları dene
              </Button>
            )}
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Gönderim Özeti</h2>
            <div className="mt-4 flex items-center gap-4">
              <Donut total={donutTotal} slices={slices} />
              <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
                {slices.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                      {item.label}
                    </span>
                    <span className="tabular-nums text-slate-800">
                      {item.value} <span className="text-slate-400">%{share(item.value, donutTotal)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Mini icon={<Users className="h-4 w-4 text-blue-600" />} label="Toplam Alıcı" value={data.validRecipientCount} hint="" />
              <Mini icon={<Send className="h-4 w-4 text-blue-600" />} label="Teslim edildi" value={delivered} hint={`%${share(delivered, data.validRecipientCount)}`} />
              <Mini icon={<X className="h-4 w-4 text-rose-600" />} label="İletilemedi" value={data.failCount} hint={`%${share(data.failCount, data.validRecipientCount)}`} />
              <Mini icon={<span className="text-sm text-orange-500">!</span>} label="Geçersiz" value={data.invalidCount} hint={`%${share(data.invalidCount, data.rawRecipientCount)}`} />
              <Mini icon={<Clock3 className="h-4 w-4 text-slate-500" />} label="Beklemede" value={pending} hint={`%${share(pending, data.validRecipientCount)}`} />
              <Mini icon={<span className="text-sm text-slate-400">–</span>} label="SMS gönderilmeyecek" value={data.smsBlockedCount || 0} hint={`%${share(data.smsBlockedCount || 0, data.rawRecipientCount)}`} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Coins className="h-4 w-4 text-slate-500" />
              Kredi Bilgisi
            </h2>
            <dl className="mt-3 divide-y divide-slate-100 text-sm">
              <CreditRow label="Tahmini SMS adedi" value={data.estimatedUnits || estimated} />
              <CreditRow label="Gerekli kredi" value={estimated} />
              <CreditRow label="Kullanılan kredi" value={data.usedUnits || 0} />
              <CreditRow label="Kalan bakiye" value={data.walletBalance} />
              <CreditRow label="Rezerve edilen kredi" value={data.reservedUnits || 0} />
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function Mini({ icon, label, value, hint }: { icon: ReactNode; label: string; value: number; hint: string }) {
  return (
    <div className="rounded-xl border border-slate-100 px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
        {value}
        {hint ? <span className="ml-2 text-xs font-medium text-slate-400">{hint}</span> : null}
      </p>
    </div>
  );
}

function CreditRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}

function Donut({ total, slices }: { total: number; slices: { value: number; color: string }[] }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg width="132" height="132" viewBox="0 0 132 132" className="shrink-0">
      <circle cx="66" cy="66" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="12" />
      {slices.map((slice) => {
        const length = total ? (slice.value / total) * circumference : 0;
        const node = (
          <circle
            key={slice.color}
            cx="66"
            cy="66"
            r={radius}
            fill="none"
            stroke={slice.color}
            strokeWidth="12"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 66 66)"
          />
        );
        offset += length;
        return length > 0 ? node : null;
      })}
      <text x="66" y="64" textAnchor="middle" fontSize="22" fontWeight="700" fill="#0f172a">
        {total}
      </text>
      <text x="66" y="80" textAnchor="middle" fontSize="11" fill="#94a3b8">
        Toplam
      </text>
    </svg>
  );
}

function statusTone(status: string) {
  if (["FAILED", "REJECTED", "EXPIRED", "CANCELLED"].includes(status)) return "bg-rose-50 text-rose-700";
  if (status === "DELIVERED") return "bg-emerald-50 text-emerald-700";
  if (status === "ACCEPTED" || status === "SENT") return "bg-blue-50 text-blue-700";
  if (["QUEUED", "PROCESSING", "SENDING"].includes(status)) return "bg-amber-50 text-amber-700";
  if (["DRAFT", "READY", "PREPARING", "SCHEDULED", "EXCLUDED", "INVALID", "DUPLICATE"].includes(status)) {
    return "bg-slate-100 text-slate-600";
  }
  return "bg-emerald-50 text-emerald-700";
}

function share(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function reasonLabel(reason: string) {
  const labels: Record<string, string> = {
    BLACKLIST: "Yasaklı",
    SMS_BLOCKED: "SMS gönderilmeyecek",
    NO_CONSENT: "İzin yok",
    INVALID_MOBILE: "Geçersiz",
    DUPLICATE_MOBILE: "Mükerrer",
    CANCELLED: "İptal",
  };
  return labels[reason] || reason;
}
