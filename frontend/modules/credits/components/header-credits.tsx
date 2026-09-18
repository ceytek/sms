"use client";

import { useEffect, useState } from "react";
import { Bot, MessageSquare } from "lucide-react";
import { creditsService } from "../services/credits.service";

function formatCredit(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value);
}

export function HeaderCredits() {
  const [smsBalance, setSmsBalance] = useState<number | null>(null);
  const [aiBalance, setAiBalance] = useState<number | null>(null);
  const [hasAiService, setHasAiService] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void creditsService
      .me()
      .then((balance) => {
        if (cancelled) return;
        setSmsBalance(balance.smsBalance);
        setAiBalance(balance.aiBalance);
        setHasAiService(balance.hasAiService);
      })
      .catch(() => {
        if (!cancelled) setSmsBalance(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (smsBalance == null) return null;

  return (
    <div className="flex items-center gap-2">
      <BalancePill
        icon={<MessageSquare className="h-3.5 w-3.5" />}
        label="SMS"
        value={formatCredit(smsBalance)}
        tone="sms"
      />
      {hasAiService && (
        <BalancePill
          icon={<Bot className="h-3.5 w-3.5" />}
          label="AI"
          value={formatCredit(aiBalance ?? 0)}
          tone="ai"
        />
      )}
    </div>
  );
}

function BalancePill({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "sms" | "ai";
}) {
  const palette =
    tone === "sms"
      ? "border-blue-100 bg-blue-50 text-blue-700"
      : "border-violet-100 bg-violet-50 text-violet-700";
  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${palette}`}>
      {icon}
      <span className="hidden text-[11px] font-semibold uppercase tracking-wide sm:inline">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-slate-900">{value}</span>
    </div>
  );
}
