"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, FilePlus2, Link2, QrCode, Smartphone } from "lucide-react";
import { KvkkOtpPage } from "./otp-page";
import { KvkkFormLinkPage } from "./form-link-page";
import { KvkkQrPage } from "./qr-page";

type Channel = "short-code" | "sms-link" | "qr";

const CHANNELS: {
  id: Channel;
  label: string;
  hint: string;
  action: string;
  icon: typeof Smartphone;
  idle: string;
  active: string;
  iconClass: string;
  actionClass: string;
  radio: string;
}[] = [
  {
    id: "short-code",
    label: "Kısa Kod",
    hint: "Telefona kod gönderin, doğrulanınca izin oluşur.",
    action: "Kısa kod ile izin topla",
    icon: Smartphone,
    idle: "border-slate-200 bg-white hover:border-blue-200",
    active: "border-blue-500 bg-blue-50/70 ring-1 ring-blue-500",
    iconClass: "bg-blue-50 text-blue-600",
    actionClass: "bg-blue-50 text-blue-700",
    radio: "border-blue-600 bg-blue-600",
  },
  {
    id: "sms-link",
    label: "SMS Link",
    hint: "Kişiye özel form linki üretin.",
    action: "SMS link ile izin topla",
    icon: Link2,
    idle: "border-slate-200 bg-white hover:border-violet-200",
    active: "border-violet-500 bg-violet-50/70 ring-1 ring-violet-500",
    iconClass: "bg-violet-50 text-violet-600",
    actionClass: "bg-violet-50 text-violet-700",
    radio: "border-violet-600 bg-violet-600",
  },
  {
    id: "qr",
    label: "QR Kod",
    hint: "Formu açan QR oluşturun.",
    action: "QR kod ile izin topla",
    icon: QrCode,
    idle: "border-slate-200 bg-white hover:border-emerald-200",
    active: "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500",
    iconClass: "bg-emerald-50 text-emerald-600",
    actionClass: "bg-emerald-50 text-emerald-700",
    radio: "border-emerald-600 bg-emerald-600",
  },
];

function parseChannel(value: string | null): Channel | "" {
  if (value === "short-code" || value === "sms-link" || value === "qr") return value;
  return "";
}

export function KvkkCollectPage() {
  const searchParams = useSearchParams();
  const [channel, setChannel] = useState<Channel | "">(() => parseChannel(searchParams.get("channel")));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">İzin Toplama</h1>
      <p className="mt-1 text-sm text-slate-500">Kısa kod, SMS link veya QR ile izin toplayın. Önce yöntemi seçin.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {CHANNELS.map((item) => {
          const active = channel === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setChannel(item.id)}
              className={`rounded-2xl border p-4 text-left shadow-sm transition ${active ? item.active : item.idle}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconClass}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block font-semibold text-slate-900">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">{item.hint}</span>
                  </span>
                </div>
                <span className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${active ? item.radio : "border-slate-300 bg-white"}`}>
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
              </div>
              <span className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${item.actionClass}`}>
                <ArrowRight className="h-4 w-4" />
                {item.action}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {channel === "short-code" && <KvkkOtpPage />}
        {channel === "sms-link" && <KvkkFormLinkPage />}
        {channel === "qr" && <KvkkQrPage />}
        {!channel && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
              <FilePlus2 className="h-6 w-6" />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                <span className="text-xs font-bold leading-none">+</span>
              </span>
            </span>
            <p className="mt-4 font-semibold text-slate-900">Henüz bir yöntem seçilmedi</p>
            <p className="mt-1 text-sm text-slate-500">Devam etmek için yukarıdan bir gönderim yöntemi seçin.</p>
          </div>
        )}
      </div>
    </div>
  );
}
