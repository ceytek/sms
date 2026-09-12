"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authService } from "@/modules/auth";
import { CompanyMap } from "@/modules/map";

export default function MapPage() {
  const router = useRouter();
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    const user = authService.getUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "DEALER")) {
      router.push("/");
      return;
    }
    setRole(user.role);
  }, [router]);

  if (!role) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return <CompanyMap userRole={role} />;
}
