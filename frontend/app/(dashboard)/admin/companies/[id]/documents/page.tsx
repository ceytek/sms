"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authService } from "@/modules/auth";
import { CompanyDocumentsPage } from "@/modules/documents";

export default function CompanyDocumentsRoutePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = authService.getUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "DEALER")) {
      router.push("/");
      return;
    }
    setReady(true);
  }, [router]);

  if (!ready || !id) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return <CompanyDocumentsPage companyId={id} />;
}
