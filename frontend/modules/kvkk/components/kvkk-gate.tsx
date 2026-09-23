"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
          <div className={`rounded-2xl border px-4 py-3 text-sm ${term?.expired ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-700"}`}>
            <p className="font-semibold">KVKK hizmet dönemi</p>
            <p className="mt-1">
              Başlangıç <span className="font-medium">{formatDate(term?.startDate)}</span>
              {" · "}
              Bitiş <span className="font-medium">{formatDate(term?.endDate)}</span>
              {term?.expired
                ? " · vadesi doldu"
                : term?.daysLeft != null
                  ? ` · ${term.daysLeft} gün kaldı`
                  : ""}
            </p>
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
