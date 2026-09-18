"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authService } from "@/modules/auth";
import { kvkkService } from "../services/kvkk.service";

export function KvkkGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

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

  return <>{children}</>;
}
