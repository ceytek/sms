"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authService } from "@/modules/auth";

export function OriginatorsAccess({
  adminOnly,
  children,
}: {
  adminOnly?: boolean;
  children: (role: string) => ReactNode;
}) {
  const router = useRouter();
  const [role, setRole] = useState("");

  useEffect(() => {
    const user = authService.getUser();
    const allowed = adminOnly
      ? user?.role === "ADMIN"
      : user?.role === "ADMIN" || user?.role === "DEALER";
    if (!user || !allowed) {
      router.push(adminOnly ? "/admin/originators" : "/");
      return;
    }
    setRole(user.role);
  }, [adminOnly, router]);

  if (!role) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return <>{children(role)}</>;
}
