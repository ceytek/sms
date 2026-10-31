"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, FileText, Globe, MessageCircle, User } from "lucide-react";
import { formService } from "../services/form.service";
import { SUBMISSION_STATUS_LABELS, type SubmissionDetail, type SubmissionStatus } from "../types";

export function FormSubmissionDetailPage({ id }: { id: string }) {
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    formService.getSubmission(id).then(setDetail).catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"));
  }, [id]);

  const statusColor: Record<string, string> = {
    NEW: "bg-blue-100 text-blue-700",
    IN_REVIEW: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    ARCHIVED: "bg-gray-100 text-gray-700",
  };

  const changeStatus = (s: string) => {
    formService.updateSubmissionStatus(id, s).then((r) => setDetail((d) => d ? { ...d, status: r.status as SubmissionStatus } : d)).catch(() => {});
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }) + " " + d.toLocaleTimeString("tr-TR");
  };

  if (error) return <div className="p-6"><div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div></div>;
  if (!detail) return <div className="p-6 text-center text-slate-400">Yükleniyor...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <Link href="/customer/forms/submissions" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Başvurulara Dön
      </Link>

      <div className="rounded-xl border bg-white">
        <div className="border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50"><FileText className="h-5 w-5 text-blue-600" /></div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-slate-900">{detail.formName}</h2>
              <p className="text-xs text-slate-500">#{detail.id.slice(0, 8)}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor[detail.status] || "bg-gray-100"}`}>
              {SUBMISSION_STATUS_LABELS[detail.status as SubmissionStatus] ?? detail.status}
            </span>
          </div>
        </div>

        <div className="divide-y">
          <div className="grid grid-cols-3 gap-4 px-5 py-3 text-sm">
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-400" /><div><p className="text-xs text-slate-500">Tarih</p><p className="font-medium">{formatDate(detail.createdAt)}</p></div></div>
            <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-slate-400" /><div><p className="text-xs text-slate-500">Kanal</p><p className="font-medium">{detail.channel}</p></div></div>
            <div className="flex items-center gap-2"><User className="h-4 w-4 text-slate-400" /><div><p className="text-xs text-slate-500">IP</p><p className="font-medium">{detail.ipAddress || "—"}</p></div></div>
          </div>

          {detail.fields.map((f, i) => {
            if (f.type === "HEADING") return null;
            const value = detail.data[f.id];
            const file = detail.files.find((fi) => fi.fieldId === f.id);
            return (
              <div key={f.id} className="px-5 py-3">
                <div className="flex items-start gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">{f.label}</p>
                    {file ? (
                      <p className="mt-0.5 text-sm font-medium text-blue-600">{file.fileName} ({(file.fileSize / 1024).toFixed(0)} KB)</p>
                    ) : (
                      <div className="mt-0.5 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-800">
                        {value !== undefined && value !== null && value !== "" ? (
                          Array.isArray(value) ? value.join(", ") : String(value)
                        ) : (
                          <span className="italic text-slate-400">Yanıt yok</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t px-5 py-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">Durum değiştir:</span>
          {(["NEW", "IN_REVIEW", "COMPLETED", "APPROVED", "REJECTED", "ARCHIVED"] as SubmissionStatus[]).map((s) => (
            <button key={s} onClick={() => changeStatus(s)} disabled={detail.status === s}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${detail.status === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {SUBMISSION_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
