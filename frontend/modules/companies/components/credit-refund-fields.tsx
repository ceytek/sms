"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { parseCreditRefundRate } from "../utils/credit-refund";

interface CreditRefundFieldsProps {
  enabled: boolean;
  rate: string;
  onEnabledChange: (enabled: boolean) => void;
  onRateChange: (rate: string) => void;
}

export function CreditRefundFields({
  enabled,
  rate,
  onEnabledChange,
  onRateChange,
}: CreditRefundFieldsProps) {
  const refundRateError =
    enabled && rate.trim()
      ? parseCreditRefundRate(rate) == null
        ? "İade oranı 0 ile 100 arasında olmalıdır"
        : ""
      : "";

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-slate-900">İade oranı ekle</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Her bayi ve müşteriye zorunlu değildir. Açarsanız gitmeyen SMS’lerden
            otomatik kontör iadesi bu orana göre hesaplanır.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => {
            onEnabledChange(checked);
            if (!checked) onRateChange("");
          }}
        />
      </div>

      {enabled && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          <Label htmlFor="creditRefundRate">İade oranı (%)</Label>
          <div className="relative max-w-xs">
            <Input
              id="creditRefundRate"
              inputMode="decimal"
              value={rate}
              onChange={(e) => onRateChange(e.target.value)}
              placeholder="Örn. 15"
              className={refundRateError ? "border-red-300 pr-8" : "pr-8"}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              %
            </span>
          </div>
          {refundRateError ? (
            <p className="text-xs text-red-500">{refundRateError}</p>
          ) : (
            <p className="text-xs text-slate-400">0 ile 100 arasında bir değer girin.</p>
          )}
        </div>
      )}
    </div>
  );
}
