"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authService } from "@/modules/auth";
import { companyService } from "@/modules/companies";
import type { CompanyServiceAssignment } from "@/modules/companies/types";
import {
  Send,
  Users,
  BarChart3,
  CreditCard,
  MessageSquare,
  CalendarRange,
} from "lucide-react";

export default function CustomerDashboard() {
  const router = useRouter();
  const [companyCode, setCompanyCode] = useState("");
  const [services, setServices] = useState<CompanyServiceAssignment[]>([]);

  useEffect(() => {
    const user = authService.getUser();
    if (!user || user.role !== "CUSTOMER") {
      router.push("/");
      return;
    }
    setCompanyCode(user.companyCode);
    void companyService
      .listMyServices()
      .then((res) => setServices(res.items ?? []))
      .catch(() => setServices([]));
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

      {services.length > 0 ? (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900">Hizmetlerim</h2>
          </div>
          <div className="space-y-2">
            {services.map((service) => (
              <ServiceTermRow key={service.serviceId} service={service} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <PlaceholderCard
          icon={<Send className="h-6 w-6 text-blue-500" />}
          title="SMS Gönderimi"
          description="Yakında aktif olacak"
        />
        <Link href="/customer/contacts">
          <PlaceholderCard
            icon={<Users className="h-6 w-6 text-emerald-500" />}
            title="Rehber"
            description="Kişileri ve grupları yönetin"
          />
        </Link>
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

function ServiceTermRow({ service }: { service: CompanyServiceAssignment }) {
  const expired = Boolean(service.expired);
  const showTerm = service.billingPeriod === "ANNUAL" || Boolean(service.startDate || service.endDate);
  const row = (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${service.isActive && !expired ? "bg-emerald-500" : "bg-slate-300"}`} />
        <div>
          <p className="text-sm font-medium text-slate-800">
            {service.serviceName ?? service.serviceId}
            {service.serviceCode === "SMS" ? (
              <span className="ml-2 text-xs font-normal text-slate-400">varsayılan</span>
            ) : showTerm ? (
              <span className="ml-2 text-xs font-normal text-slate-400">yıllık</span>
            ) : null}
          </p>
          {showTerm ? (
            <p className={`mt-0.5 text-xs ${expired ? "text-amber-700" : "text-slate-500"}`}>
              Başlangıç <span className="font-medium text-slate-700">{formatDate(service.startDate)}</span>
              {" · "}
              Bitiş <span className="font-medium text-slate-700">{formatDate(service.endDate)}</span>
              {expired
                ? " · vadesi doldu"
                : service.daysLeft != null
                  ? ` · ${service.daysLeft} gün kaldı`
                  : ""}
            </p>
          ) : null}
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
          expired
            ? "border-amber-200 bg-amber-50 text-amber-800"
            : service.isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-100 text-slate-500"
        }`}
      >
        {expired ? "Vadesi doldu" : service.isActive ? "Aktif" : "Pasif"}
      </span>
    </div>
  );

  if (service.serviceCode === "KVKK" && service.isActive && !expired) {
    return <Link href="/customer/kvkk" className="block">{row}</Link>;
  }
  return row;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
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
