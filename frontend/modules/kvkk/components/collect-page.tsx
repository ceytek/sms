"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { KvkkOtpPage } from "./otp-page";
import { KvkkFormLinkPage } from "./form-link-page";
import { KvkkQrPage } from "./qr-page";

type Channel = "short-code" | "sms-link" | "qr";

const CHANNELS: { id: Channel; label: string; hint: string }[] = [
  { id: "short-code", label: "Kısa Kod", hint: "Telefona kod gönderin, doğrulanınca izin oluşur." },
  { id: "sms-link", label: "SMS Link", hint: "Kişiye özel form linki üretin." },
  { id: "qr", label: "QR Kod", hint: "Formu açan QR oluşturun." },
];

function parseChannel(value: string | null): Channel | "" {
  if (value === "short-code" || value === "sms-link" || value === "qr") return value;
  return "";
}

export function KvkkCollectPage() {
  const searchParams = useSearchParams();
  const [channel, setChannel] = useState<Channel | "">(() => parseChannel(searchParams.get("channel")));
  const selected = CHANNELS.find((item) => item.id === channel);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">İzin Toplama</h1>
      <p className="mb-6 text-sm text-slate-500">Kısa kod, SMS link veya QR ile izin toplayın. Önce yöntemi seçin.</p>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {CHANNELS.map((item) => {
          const active = channel === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setChannel(item.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                active ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-200"
              }`}
            >
              <p className={`font-semibold ${active ? "text-blue-700" : "text-slate-900"}`}>{item.label}</p>
              <p className="mt-1 text-xs text-slate-500">{item.hint}</p>
            </button>
          );
        })}
      </div>
      {selected ? (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">{selected.label}</h2>
          {channel === "short-code" && <KvkkOtpPage />}
          {channel === "sms-link" && <KvkkFormLinkPage />}
          {channel === "qr" && <KvkkQrPage />}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
          Devam etmek için bir gönderim yöntemi seçin.
        </p>
      )}
    </div>
  );
}
