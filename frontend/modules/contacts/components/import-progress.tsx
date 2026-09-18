"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ImportJobRecord } from "../types";
import { ERROR_TYPE_LABELS } from "../types";

export function useImportProgress() {
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [result, setResult] = useState<ImportJobRecord | null>(null);

  const run = async (action: () => Promise<ImportJobRecord>) => {
    setPhase("running");
    setResult(null);
    try {
      const next = await action();
      setResult(next);
      setPhase("done");
      return next;
    } catch (err) {
      setPhase("idle");
      setResult(null);
      throw err;
    }
  };

  return { phase, result, run };
}

export function ImportProgressOverlay({
  phase,
  result,
  onFinish,
}: {
  phase: "idle" | "running" | "done";
  result: ImportJobRecord | null;
  onFinish: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const imported = result?.successfulRows ?? 0;
  const duplicate = (result?.duplicateRows ?? 0) + (result?.existingRows ?? 0);
  const broken = result?.failedRows ?? 0;
  const done = phase === "done" && result;
  const visible = phase !== "idle";

  return createPortal(
    <div className={visible ? "fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" : "hidden"}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {done ? "Aktarım Özeti" : "Aktarılıyor"}
        </h2>

        <div className={done ? "hidden" : "space-y-5 py-4 text-center"}>
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600" />
          <div>
            <p className="text-base font-medium text-slate-900">Kişiler aktarılıyor</p>
            <p className="mt-1 text-sm text-slate-500">İşlem bitince kısa özet gösterilecek.</p>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-full animate-pulse rounded-full bg-blue-600/80" />
          </div>
        </div>

        <div className={done ? "space-y-5" : "hidden"}>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
            <p className="mt-2 text-base font-semibold text-slate-900">Aktarım tamamlandı</p>
            <p className="text-sm text-slate-600">{result?.totalRows ?? 0} kayıt işlendi</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <SummaryStat label="Aktarıldı" value={imported} />
            <SummaryStat label="Mükerrer" value={duplicate} />
            <SummaryStat label="Bozuk" value={broken} />
          </div>
          <p className="text-sm text-slate-600">
            {imported} kişi aktarıldı, {duplicate} mükerrer, {broken} bozuk kayıt atlandı.
          </p>
          {!!result?.errors?.length && (
            <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 text-sm">
              {result.errors.slice(0, 30).map((item, index) => (
                <div key={index} className="border-b border-slate-100 px-3 py-2 last:border-0">
                  {item.rowNumber ? `Satır ${item.rowNumber}: ` : ""}
                  {ERROR_TYPE_LABELS[item.errorType ?? ""] ?? item.errorMessage}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={onFinish} className="bg-blue-600 hover:bg-blue-700">Tamam</Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
