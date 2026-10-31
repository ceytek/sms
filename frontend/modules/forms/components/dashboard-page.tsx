"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, FileText, Inbox, Plus, CalendarCheck, TrendingUp } from "lucide-react";
import { formService } from "../services/form.service";
import type { FormRecord } from "../types";
import { FORM_STATUS_LABELS, type FormStatus } from "../types";

export function FormDashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState({ total: 0, active: 0, submissions: 0, drafts: 0, today: 0, thisMonth: 0, incomplete: 0 });
  const [rows, setRows] = useState<FormRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    formService.dashboard().then(setSummary).catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"));
    formService.list().then(setRows).catch(() => {});
  }, []);

  const cards = [
    { label: "Toplam Form", value: summary.total, icon: ClipboardList, color: "blue" },
    { label: "Aktif Form", value: summary.active, icon: FileText, color: "emerald" },
    { label: "Toplam Başvuru", value: summary.submissions, icon: Inbox, color: "violet" },
    { label: "Bugünkü Başvuru", value: summary.today, icon: CalendarCheck, color: "amber" },
    { label: "Bu Ay Başvuru", value: summary.thisMonth, icon: TrendingUp, color: "sky" },
    { label: "Yeni Başvuru", value: summary.incomplete, icon: Inbox, color: "orange" },
  ];

  const bgMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
    orange: "bg-orange-50 text-orange-600",
  };

  const statusColor: Record<string, string> = {
    DRAFT: "bg-slate-100 text-slate-700",
    ACTIVE: "bg-emerald-100 text-emerald-700",
    PASSIVE: "bg-amber-100 text-amber-700",
    EXPIRED: "bg-red-100 text-red-700",
    ARCHIVED: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Formlar</h1>
        <Link
          href="/customer/forms/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Yeni Form
        </Link>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgMap[c.color]}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{c.value.toLocaleString("tr-TR")}</p>
                <p className="text-xs text-slate-500">{c.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white">
        <div className="border-b px-5 py-3">
          <h2 className="font-semibold text-slate-800">Son Formlar</h2>
        </div>
        <div className="overflow-hidden">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left" style={{ width: "30%" }}>Form</th>
                <th className="px-4 py-2.5 text-left" style={{ width: "12%" }}>Durum</th>
                <th className="px-4 py-2.5 text-right" style={{ width: "12%" }}>Başvuru</th>
                <th className="px-4 py-2.5 text-left" style={{ width: "15%" }}>Oluşturma</th>
                <th className="px-4 py-2.5 text-left" style={{ width: "15%" }}>Son Başvuru</th>
                <th className="px-4 py-2.5 text-right" style={{ width: "16%" }}>İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.slice(0, 10).map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 truncate font-medium text-slate-900">{row.name}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[row.status] || "bg-gray-100 text-gray-700"}`}>
                      {FORM_STATUS_LABELS[row.status as FormStatus] ?? row.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">{row.submissions.toLocaleString("tr-TR")}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{new Date(row.createdAt).toLocaleDateString("tr-TR")}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-500">{row.lastSubmission ? new Date(row.lastSubmission).toLocaleDateString("tr-TR") : "—"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => router.push(`/customer/forms/${row.id}`)} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100">
                      Aç
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Henüz form oluşturulmamış</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
