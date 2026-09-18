"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { kvkkService } from "../services/kvkk.service";
import type { KvkkConsentDetail } from "../types";
import { KVKK_METHOD_LABELS, KVKK_STATUS_LABELS } from "../types";

export function KvkkConsentDetailPage() {
  const params = useParams<{ id: string }>();
  const [item, setItem] = useState<KvkkConsentDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void kvkkService.getConsent(params.id).then(setItem).catch((err) => setError(err instanceof Error ? err.message : "Kayıt yüklenemedi"));
  }, [params.id]);

  const cancel = async () => {
    if (!item || !confirm("İzni iptal etmek istediğinize emin misiniz?")) return;
    try {
      setItem(await kvkkService.cancelConsent(item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "İptal edilemedi");
    }
  };

  if (!item) return <p className="p-6 text-sm text-slate-500">{error || "Yükleniyor..."}</p>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <Link href="/customer/kvkk/consents" className="text-sm text-blue-600">← İzin kayıtları</Link>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{item.firstName} {item.lastName}</h1>
          <p className="text-sm text-slate-500">{item.formattedPhone}</p>
        </div>
        {item.status === "APPROVED" && (
          <Button variant="outline" onClick={() => void cancel()}>İzni İptal Et</Button>
        )}
      </div>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm">
        <Row label="Durum" value={KVKK_STATUS_LABELS[item.status]} />
        <Row label="Yöntem" value={KVKK_METHOD_LABELS[item.method]} />
        <Row label="E-posta" value={item.email || "-"} />
        <Row label="Form" value={item.formName || "-"} />
        <Row label="KVKK Metni" value={item.textVersionNumber ? `${item.textTitle} (v${item.textVersionNumber})` : "-"} />
        <Row label="Onay tarihi" value={item.approvedAt ? new Date(item.approvedAt).toLocaleString("tr-TR") : "-"} />
        <Row label="İptal tarihi" value={item.cancelledAt ? new Date(item.cancelledAt).toLocaleString("tr-TR") : "-"} />
        <Row label="İptal kaynağı" value={item.cancelSource || "-"} />
        <Row label="QR" value={item.qrName || "-"} />
      </div>
      {!!item.checkboxAnswers.length && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">Kabul edilen kutular</h2>
          <ul className="space-y-2 text-sm">
            {item.checkboxAnswers.map((box) => (
              <li key={box.id} className={box.checked ? "text-emerald-700" : "text-slate-400"}>
                {box.checked ? "✓" : "○"} {box.label} {box.required ? "(zorunlu)" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {item.textBody && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">Onaylanan metin</h2>
          <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: item.textBody }} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
