"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/modules/auth";
import {
  Send,
  Users,
  BarChart3,
  CreditCard,
  MessageSquare,
} from "lucide-react";

export default function CustomerDashboard() {
  const router = useRouter();
  const [companyCode, setCompanyCode] = useState("");

  useEffect(() => {
    const user = authService.getUser();
    if (!user || user.role !== "CUSTOMER") {
      router.push("/");
      return;
    }
    setCompanyCode(user.companyCode);
  }, [router]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Müşteri Paneline Hoş Geldiniz
        </h1>
        <p className="mt-2 text-slate-500">
          Firma Kodu: <span className="font-medium text-slate-700">{companyCode}</span>
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <PlaceholderCard
          icon={<Send className="h-6 w-6 text-blue-500" />}
          title="SMS Gönderimi"
          description="Yakında aktif olacak"
        />
        <PlaceholderCard
          icon={<Users className="h-6 w-6 text-emerald-500" />}
          title="Rehber"
          description="Yakında aktif olacak"
        />
        <PlaceholderCard
          icon={<BarChart3 className="h-6 w-6 text-orange-500" />}
          title="Raporlar"
          description="Yakında aktif olacak"
        />
        <PlaceholderCard
          icon={<CreditCard className="h-6 w-6 text-purple-500" />}
          title="Bakiye"
          description="Yakında aktif olacak"
        />
      </div>

      <div className="mt-8 rounded-lg border border-blue-100 bg-blue-50 p-6">
        <div className="flex items-start gap-3">
          <MessageSquare className="mt-0.5 h-5 w-5 text-blue-500" />
          <div>
            <h3 className="font-semibold text-blue-900">Geliştirme Aşamasında</h3>
            <p className="mt-1 text-sm text-blue-700">
              Bu panel ileride SMS gönderimi, kampanya yönetimi, rehber, raporlama ve
              bakiye yönetimi gibi özellikleri içerecektir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaceholderCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}
