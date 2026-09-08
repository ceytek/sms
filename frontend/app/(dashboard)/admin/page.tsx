"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/modules/auth";
import {
  Building2,
  Users,
  Send,
  CreditCard,
  Settings,
  Shield,
  BarChart3,
  Sparkles,
} from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();

  useEffect(() => {
    const user = authService.getUser();
    if (!user || user.role !== "ADMIN") {
      router.push("/");
      return;
    }
  }, [router]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Admin Yönetim Paneline Hoş Geldiniz
        </h1>
        <p className="mt-2 text-slate-500">
          Sistem yönetimi ve müşteri operasyonları
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <PlaceholderCard
          icon={<Building2 className="h-6 w-6 text-blue-500" />}
          title="Firma Yönetimi"
          description="Yakında aktif olacak"
        />
        <PlaceholderCard
          icon={<Users className="h-6 w-6 text-emerald-500" />}
          title="Kullanıcı Yönetimi"
          description="Yakında aktif olacak"
        />
        <PlaceholderCard
          icon={<Send className="h-6 w-6 text-orange-500" />}
          title="SMS Yönetimi"
          description="Yakında aktif olacak"
        />
        <PlaceholderCard
          icon={<CreditCard className="h-6 w-6 text-purple-500" />}
          title="Bakiye Yönetimi"
          description="Yakında aktif olacak"
        />
        <PlaceholderCard
          icon={<BarChart3 className="h-6 w-6 text-cyan-500" />}
          title="Raporlar"
          description="Yakında aktif olacak"
        />
        <PlaceholderCard
          icon={<Sparkles className="h-6 w-6 text-amber-500" />}
          title="AI Yönetimi"
          description="Yakında aktif olacak"
        />
        <PlaceholderCard
          icon={<Shield className="h-6 w-6 text-red-500" />}
          title="Güvenlik"
          description="Yakında aktif olacak"
        />
        <PlaceholderCard
          icon={<Settings className="h-6 w-6 text-gray-500" />}
          title="Sistem Ayarları"
          description="Yakında aktif olacak"
        />
      </div>

      <div className="mt-8 rounded-lg border border-amber-100 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 text-amber-600" />
          <div>
            <h3 className="font-semibold text-amber-900">Geliştirme Aşamasında</h3>
            <p className="mt-1 text-sm text-amber-700">
              Bu panel ileride firma oluşturma, kullanıcı yönetimi, SMS bakiyesi tanımlama,
              AI kontörü yönetimi ve sistem ayarları gibi özellikleri içerecektir.
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
