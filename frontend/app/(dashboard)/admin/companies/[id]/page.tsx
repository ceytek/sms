"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { authService } from "@/modules/auth";
import {
  CompanyDetailView,
  companyService,
  CompanyDetail,
} from "@/modules/companies";
import { Loader2 } from "lucide-react";

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = authService.getUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "DEALER")) {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await companyService.getById(id);
        setCompany(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Firma yüklenemedi");
      } finally {
        setIsLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12 text-center">
        <p className="text-red-600">{error || "Firma bulunamadı"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <CompanyDetailView company={company} />
    </div>
  );
}
