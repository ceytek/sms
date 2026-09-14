"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  Coins,
  Loader2,
  MessageSquare,
  Search,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { creditsService } from "../services/credits.service";
import type { CreditCustomer, CreditHistoryItem, CreditHistorySummary, HistoryPeriod, WalletType } from "../types";

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000, 50000];
const HISTORY_PERIODS: { id: HistoryPeriod; label: string; phrase: string }[] = [
  { id: "DAY", label: "Gün", phrase: "Bugün" },
  { id: "WEEK", label: "Hafta", phrase: "Bu hafta" },
  { id: "MONTH", label: "Ay", phrase: "Bu ay" },
  { id: "YEAR", label: "Yıl", phrase: "Bu yıl" },
];

function formatCredit(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function parseNumber(value: string, min?: number) {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return null;
  if (min != null && amount < min) return null;
  return amount;
}

function parseDelta(value: string) {
  const amount = parseNumber(value);
  if (amount == null || amount === 0) return null;
  return amount;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function statusLabel(status: CreditCustomer["status"]) {
  if (status === "ACTIVE") return "Aktif";
  if (status === "PASSIVE") return "Pasif";
  return "Askıda";
}

export function CreditsManager() {
  const [customers, setCustomers] = useState<CreditCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<CreditCustomer | null>(null);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await creditsService.listCustomers(search || undefined);
      const items = result.items ?? [];
      setCustomers(items);
      setSelected((current) => {
        if (!current) return current;
        return items.find((item) => item.id === current.id) ?? current;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Müşteriler yüklenemedi");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadCustomers();
    }, search ? 250 : 0);
    return () => window.clearTimeout(handle);
  }, [loadCustomers, search]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kredi Yönetimi</h1>
          <p className="mt-1 text-sm text-slate-500">
            Müşterilerinize SMS ve AI kredisi yükleyin. Müşteriler bu ekranı görmez; talep telefonla gelir.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Müşteri adı veya kod ara"
                className="h-10 pl-9"
              />
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : customers.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              Yüklenecek müşteri bulunamadı.
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto p-2">
              {customers.map((customer) => {
                const active = selected?.id === customer.id;
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => setSelected(customer)}
                    className={`mb-1 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                      active ? "bg-slate-900 text-white" : "hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                        active ? "bg-white/15 text-white" : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {initials(customer.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate font-semibold ${active ? "text-white" : "text-slate-900"}`}>
                          {customer.name}
                        </p>
                        {customer.status !== "ACTIVE" && (
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              active ? "bg-white/10 text-white" : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {statusLabel(customer.status)}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs ${active ? "text-slate-300" : "text-slate-500"}`}>
                        {customer.companyCode}
                      </p>
                      <div className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs ${active ? "text-slate-200" : "text-slate-600"}`}>
                        <span>SMS {formatCredit(customer.smsBalance)}</span>
                        <span>
                          {customer.hasAiService ? `AI ${formatCredit(customer.aiBalance)}` : "AI kapalı"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="hidden min-h-[560px] lg:block">
          {selected ? (
            <CustomerCreditPanel
              customer={selected}
              onClose={() => setSelected(null)}
              onLoaded={loadCustomers}
              overlay={false}
            />
          ) : (
            <div className="flex h-full min-h-[560px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Wallet className="h-6 w-6" />
              </div>
              <p className="mt-4 font-semibold text-slate-900">Müşteri seçin</p>
              <p className="mt-1 max-w-xs text-sm text-slate-500">
                Soldan bir müşteri seçerek bakiye görün, kredi yükleyin ve geçmişi inceleyin.
              </p>
            </div>
          )}
        </section>
      </div>

      {selected && (
        <div className="lg:hidden">
          <CustomerCreditPanel
            customer={selected}
            onClose={() => setSelected(null)}
            onLoaded={loadCustomers}
            overlay
          />
        </div>
      )}
    </div>
  );
}

function CustomerCreditPanel({
  customer,
  onClose,
  onLoaded,
  overlay,
}: {
  customer: CreditCustomer;
  onClose: () => void;
  onLoaded: () => Promise<void>;
  overlay: boolean;
}) {
  const [walletType, setWalletType] = useState<WalletType>("SMS");
  const [amount, setAmount] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [formError, setFormError] = useState("");
  const [history, setHistory] = useState<CreditHistoryItem[]>([]);
  const [historySummary, setHistorySummary] = useState<CreditHistorySummary | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyTab, setHistoryTab] = useState<WalletType>("SMS");
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>("MONTH");

  const canLoadAi = customer.hasAiService;
  const parsedAmount = parseDelta(amount);
  const isRefund = (parsedAmount ?? 0) < 0;
  const canSelectAi = canLoadAi || customer.aiBalance > 0;
  const canLoad =
    (walletType === "SMS" || canSelectAi) &&
    (customer.status === "ACTIVE" || isRefund);
  const parsedUnitPrice = unitPrice.trim() ? parseNumber(unitPrice, 0) : null;
  const currentBalance = walletType === "SMS" ? customer.smsBalance : customer.aiBalance;

  const loadHistory = useCallback(async (wallet: WalletType = historyTab, period: HistoryPeriod = historyPeriod) => {
    setHistoryLoading(true);
    try {
      const result = await creditsService.history(customer.id, wallet, period);
      setHistory(result.items ?? []);
      setHistorySummary(result.summary ?? null);
    } catch {
      setHistory((current) => current);
    } finally {
      setHistoryLoading(false);
    }
  }, [customer.id, historyTab, historyPeriod]);

  useEffect(() => {
    setWalletType("SMS");
    setAmount("");
    setUnitPrice("");
    setFormError("");
    setConfirming(false);
    setHistoryTab("SMS");
    setHistoryPeriod("MONTH");
    setHistorySummary(null);
  }, [customer.id]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const submit = async () => {
    if (!parsedAmount) {
      setFormError("Miktar girin. İade için eksi yazın, örn. -1000");
      return;
    }
    if (isRefund && currentBalance + parsedAmount < 0) {
      setFormError(`Bakiye yetersiz. Mevcut ${walletType} bakiyesi ${formatCredit(currentBalance)}`);
      return;
    }
    if (unitPrice.trim() && parsedUnitPrice == null) {
      setFormError("Birim fiyat geçersiz. Boş bırakabilir veya pozitif bir tutar girebilirsiniz.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const result = await creditsService.load({
        companyId: customer.id,
        walletType,
        amount: parsedAmount,
        ...(parsedUnitPrice != null ? { unitPrice: parsedUnitPrice } : {}),
      });
      const nextItem: CreditHistoryItem = {
        id: result.id,
        walletType: result.walletType,
        transactionType: result.transactionType,
        amount: result.amount,
        unitPrice: result.unitPrice,
        balanceBefore: result.balanceAfter - result.amount,
        balanceAfter: result.balanceAfter,
        priceListName: result.priceListName,
        createdByName: null,
        createdAt: result.createdAt,
      };
      setAmount("");
      setUnitPrice("");
      setConfirming(false);
      setHistoryTab(walletType);
      setHistory((current) => [nextItem, ...current.filter((row) => row.id !== nextItem.id)]);
      await onLoaded();
      await loadHistory(walletType, historyPeriod);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Kredi yüklenemedi");
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  const body = (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Kredi yükle</p>
          <h2 className="mt-1 truncate text-lg font-bold text-slate-900">{customer.name}</h2>
          <p className="text-sm text-slate-500">{customer.companyCode}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Kapat"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="grid grid-cols-2 gap-3">
          <BalanceCard
            label="SMS bakiyesi"
            value={customer.smsBalance}
            icon={<MessageSquare className="h-4 w-4" />}
            tone="sms"
          />
          <BalanceCard
            label="AI bakiyesi"
            value={customer.aiBalance}
            icon={<Bot className="h-4 w-4" />}
            tone="ai"
            disabled={!customer.hasAiService}
          />
        </div>

        {customer.priceList && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
            Fiyat şablonu: <span className="font-medium text-slate-900">{customer.priceList.name}</span>
            <span className="ml-1 text-slate-400">(bilgi amaçlı)</span>
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Coins className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">Yeni yükleme</h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <TypeButton
              active={walletType === "SMS"}
              onClick={() => setWalletType("SMS")}
              icon={<MessageSquare className="h-4 w-4" />}
              label="SMS kredisi"
            />
            <TypeButton
              active={walletType === "AI"}
              disabled={!canSelectAi}
              onClick={() => canSelectAi && setWalletType("AI")}
              icon={<Sparkles className="h-4 w-4" />}
              label={canSelectAi ? "AI kredisi" : "AI servisi yok"}
            />
          </div>

          {!canLoadAi && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Bu müşteride AI servisi kapalı. Servis açılınca AI kredisi yüklenebilir.
            </p>
          )}

          {customer.status !== "ACTIVE" && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {statusLabel(customer.status)} müşteriye kredi yüklenemez.
            </p>
          )}

          <label className="mt-4 block text-sm font-medium text-slate-700">Miktar</label>
          <Input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Örn. 5000 veya -1000"
            inputMode="decimal"
            disabled={!canLoad}
            className="mt-1.5 h-11 text-base"
          />
          <p className="mt-1.5 text-xs text-slate-500">İade için eksi değer yazın; bakiyeden düşülür.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                disabled={!canLoad}
                onClick={() => setAmount(String(value))}
                className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                {formatCredit(value)}
              </button>
            ))}
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Birim fiyat <span className="font-normal text-slate-400">(opsiyonel)</span>
          </label>
          <Input
            value={unitPrice}
            onChange={(event) => setUnitPrice(event.target.value)}
            placeholder="Boş bırakılabilir"
            inputMode="decimal"
            disabled={!canLoad}
            className="mt-1.5 h-10"
          />

          {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

          <Button
            className="mt-4 h-10 w-full"
            variant={isRefund ? "destructive" : "default"}
            disabled={!canLoad || !parsedAmount || saving}
            onClick={() => setConfirming(true)}
          >
            {isRefund ? `${walletType} iade et` : `${walletType} kredisi yükle`}
          </Button>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Hareket geçmişi</h3>
            <div className="flex rounded-lg border border-slate-200 p-0.5">
              {(["SMS", "AI"] as WalletType[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setHistoryTab(tab)}
                  className={`rounded-md px-3 py-1 text-xs font-medium ${
                    historyTab === tab ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex rounded-lg border border-slate-200 p-0.5">
              {HISTORY_PERIODS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setHistoryPeriod(item.id)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                    historyPeriod === item.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {historySummary && (
              <p className="text-[11px] text-slate-400">
                {HISTORY_PERIODS.find((item) => item.id === historyPeriod)?.phrase}
                {historySummary.count === 0 ? (
                  " · hareket yok"
                ) : (
                  <>
                    {" "}
                    net {historySummary.net > 0 ? "+" : ""}
                    {formatCredit(historySummary.net)}
                    {historySummary.refunded > 0 && (
                      <> · iade {formatCredit(historySummary.refunded)}</>
                    )}
                  </>
                )}
              </p>
            )}
          </div>

          {historyLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
              {HISTORY_PERIODS.find((item) => item.id === historyPeriod)?.phrase} henüz {historyTab} hareketi yok.
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => {
                const refund = item.transactionType === "REFUND" || item.amount < 0;
                return (
                <div key={item.id} className="rounded-xl border border-slate-200 px-3.5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`font-semibold ${refund ? "text-red-600" : "text-slate-900"}`}>
                        {refund ? "" : "+"}
                        {formatCredit(item.amount)}
                        <span className="ml-2 text-xs font-medium text-slate-400">
                          {refund ? "İade" : "Yükleme"}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                    </div>
                    <p className="text-xs text-slate-500">Bakiye {formatCredit(item.balanceAfter)}</p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    {item.unitPrice != null && <span>Birim {formatMoney(item.unitPrice)}</span>}
                    {item.priceListName && <span>Şablon: {item.priceListName}</span>}
                    {item.createdByName && <span>{refund ? "İşleyen" : "Yükleyen"}: {item.createdByName}</span>}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-3">
        <Link href={`/admin/companies/${customer.id}`} className="inline-flex items-center text-sm font-medium text-blue-600 hover:underline">
          Firma detayına git
          <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </div>

      {confirming && parsedAmount && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              {isRefund ? "İadeyi onayla" : "Yüklemeyi onayla"}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{customer.name}</span> hesabından{" "}
              {isRefund ? (
                <>
                  <span className="font-semibold">{formatCredit(Math.abs(parsedAmount))} {walletType}</span> kredisi
                  düşülecek. Yeni bakiye:{" "}
                  <span className="font-semibold">{formatCredit(currentBalance + parsedAmount)}</span>
                </>
              ) : (
                <>
                  <span className="font-semibold">{formatCredit(parsedAmount)} {walletType}</span> kredisi
                  yüklenecek.
                </>
              )}
            </p>
            {parsedUnitPrice != null && (
              <p className="mt-1 text-sm text-slate-500">Birim fiyat: {formatMoney(parsedUnitPrice)}</p>
            )}
            {customer.priceList && (
              <p className="mt-1 text-sm text-slate-500">Şablon: {customer.priceList.name}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={saving}>
                Vazgeç
              </Button>
              <Button onClick={() => void submit()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Onayla"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!overlay) {
    return <div className="relative h-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm">{body}</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <button type="button" className="h-full flex-1" onClick={onClose} aria-label="Kapat" />
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">{body}</aside>
    </div>
  );
}

function BalanceCard({
  label,
  value,
  icon,
  tone,
  disabled,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: "sms" | "ai";
  disabled?: boolean;
}) {
  const palette =
    tone === "sms"
      ? "bg-blue-50 text-blue-700"
      : "bg-violet-50 text-violet-700";
  return (
    <div className={`rounded-2xl border border-slate-200 p-4 ${disabled ? "opacity-55" : ""}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${palette}`}>{icon}</span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
        {disabled ? "—" : formatCredit(value)}
      </p>
      {disabled && <p className="mt-1 text-xs text-slate-500">Servis aktif değil</p>}
    </div>
  );
}

function TypeButton({
  active,
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 text-slate-700 hover:bg-slate-50"
      } disabled:cursor-not-allowed disabled:opacity-45`}
    >
      {icon}
      {label}
    </button>
  );
}
