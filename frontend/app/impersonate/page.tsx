"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authService } from "@/modules/auth";

function ImpersonateBootstrap() {
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const key = searchParams.get("k");
    if (!key) {
      setError("Geçersiz oturum bağlantısı.");
      return;
    }

    const session = authService.completeImpersonationHandoff(key);
    if (!session) {
      setError("Oturum süresi doldu. Lütfen listeden tekrar giriş yapın.");
      return;
    }

    const target = session.user.role === "CUSTOMER" ? "/customer" : "/admin";
    window.location.replace(target);
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        <span className="text-sm">Hesaba giriş yapılıyor...</span>
      </div>
    </div>
  );
}

export default function ImpersonatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
        </div>
      }
    >
      <ImpersonateBootstrap />
    </Suspense>
  );
}
