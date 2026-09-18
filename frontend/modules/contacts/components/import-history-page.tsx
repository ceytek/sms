"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { contactImportsService } from "../services/imports.service";
import type { ImportJobRecord } from "../types";
import { ERROR_TYPE_LABELS, IMPORT_STATUS_LABELS, IMPORT_TYPE_LABELS } from "../types";

export function ImportHistoryPage() {
  const [jobs, setJobs] = useState<ImportJobRecord[]>([]);
  const [detail, setDetail] = useState<ImportJobRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await contactImportsService.listJobs());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Geçmiş yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Aktarım Geçmişi</h1>
      <p className="mb-6 text-sm text-slate-500">Excel, CSV, toplu numara ve firma aktarımları.</p>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {loading && <div className="p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" /></div>}
        {jobs.map((job) => (
          <button
            key={job.id}
            type="button"
            onClick={() => void contactImportsService.getJob(job.id).then(setDetail)}
            className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50"
          >
            <div>
              <p className="font-medium text-slate-900">{job.fileName}</p>
              <p className="text-xs text-slate-500">{IMPORT_TYPE_LABELS[job.importType]} · {new Date(job.createdAt).toLocaleString("tr-TR")}</p>
            </div>
            <div className="text-sm text-slate-600">
              Toplam {job.totalRows} · Başarılı {job.successfulRows} · Hatalı {job.failedRows} · Mükerrer {job.duplicateRows} · {IMPORT_STATUS_LABELS[job.status]}
            </div>
          </button>
        ))}
        {!loading && !jobs.length && <p className="p-8 text-center text-slate-400">Aktarım kaydı yok</p>}
      </div>
      {detail && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">{detail.fileName} hata listesi</h2>
          <div className="max-h-80 overflow-y-auto text-sm">
            {(detail.errors ?? []).map((item, index) => (
              <div key={index} className="border-b border-slate-100 py-2 last:border-0">
                Satır {item.rowNumber ?? "—"} · {ERROR_TYPE_LABELS[item.errorType ?? ""] ?? item.errorMessage}
              </div>
            ))}
            {!detail.errors?.length && <p className="text-slate-400">Hata yok</p>}
          </div>
        </div>
      )}
    </div>
  );
}
