"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarDays, Loader2 } from "lucide-react";
import { authService } from "@/modules/auth";
import { kvkkService } from "../services/kvkk.service";
import type { KvkkStatus } from "../types";

export function KvkkGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [term, setTerm] = useState<KvkkStatus["term"]>(null);

  useEffect(() => {
    const user = authService.getUser();
    if (!user || user.role !== "CUSTOMER") {
      router.push("/");
      return;
    }
    void kvkkService
      .status()
      .then((status) => {
        if (!status.enabled) {
          router.push("/customer");
          return;
        }
        setTerm(status.term ?? null);
        setReady(true);
      })
      .catch(() => router.push("/customer"));
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      {term?.startDate || term?.endDate ? (
        <div className="mx-auto max-w-5xl px-4 pt-6 md:px-6">
          <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${term?.expired ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${term?.expired ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-600"}`}>
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">KVKK hizmet dönemi</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Başlangıç {formatDate(term?.startDate)} · Bitiş {formatDate(term?.endDate)}
                  {term?.expired
                    ? " · vadesi doldu"
                    : term?.daysLeft != null
                      ? ` · ${term.daysLeft} gün kaldı`
                      : ""}
                </p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${term?.expired ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
              <CalendarDays className="h-3.5 w-3.5" />
              {term?.expired ? "Süresi doldu" : "Aktif dönem"}
            </span>
          </div>
        </div>
      ) : null}
      {children}
    </>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}
