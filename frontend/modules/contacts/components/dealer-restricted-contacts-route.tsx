"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authService } from "@/modules/auth";
import { RestrictedContactsPage } from "./restricted-contacts-page";

export function DealerRestrictedContactsRoute({
  status,
}: {
  status: "BLACKLIST" | "SMS_BLOCKED";
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = authService.getUser();
    if (!user || (user.role !== "DEALER" && user.role !== "ADMIN")) {
      router.push("/");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return <RestrictedContactsPage status={status} audience="dealer" />;
}
