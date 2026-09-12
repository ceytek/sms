"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authService } from "@/modules/auth";
import type { User } from "@/modules/auth";
import {
  Building2,
  Users,
  UserCheck,
  Activity,
  Plus,
  CreditCard,
  Radio,
  Eye,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = authService.getUser();
    if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "DEALER")) {
      router.push("/");
      return;
    }
    setUser(currentUser);
  }, [router]);

  if (!user) return null;

  if (user.role === "DEALER") {
    return <DealerDashboard username={user.username} />;
  }

  return <AdminDashboardContent username={user.username} />;
}

function AdminDashboardContent({ username }: { username: string }) {
  const stats = [
    { label: "Toplam Firma", value: "24", icon: <Building2 className="h-6 w-6 text-blue-500" />, bg: "bg-blue-50" },
    { label: "Toplam Bayi", value: "8", icon: <Users className="h-6 w-6 text-emerald-500" />, bg: "bg-emerald-50" },
    { label: "Toplam Müşteri", value: "156", icon: <UserCheck className="h-6 w-6 text-purple-500" />, bg: "bg-purple-50" },
    { label: "Aktif Kullanıcı", value: "42", icon: <Activity className="h-6 w-6 text-orange-500" />, bg: "bg-orange-50" },
  ];

  const quickActions = [
    { label: "Yeni Bayi Ekle", href: "/admin/companies/new?type=dealer", icon: <Plus className="h-5 w-5" />, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Yeni Müşteri Ekle", href: "/admin/companies/new?type=customer", icon: <Plus className="h-5 w-5" />, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Fiyat Şablonları", href: "/admin/pricing", icon: <CreditCard className="h-5 w-5" />, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "SMS Sağlayıcılar", href: "/admin/providers", icon: <Radio className="h-5 w-5" />, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Yönetim Paneli</h1>
        <p className="mt-1 text-slate-500">
          Hoş geldiniz, <span className="font-medium">{username}</span>. Sistem genel görünümü aşağıdadır.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="border border-gray-200 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Hızlı İşlemler</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Card className="group border border-gray-200 shadow-sm hover:border-blue-200 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.bg} ${action.color}`}>
                      {action.icon}
                    </div>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                      {action.label}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-transform group-hover:translate-x-0.5" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function DealerDashboard({ username }: { username: string }) {
  const stats = [
    { label: "Toplam Müşteri", value: "32", icon: <Building2 className="h-6 w-6 text-blue-500" />, bg: "bg-blue-50" },
    { label: "Aktif Müşteri", value: "28", icon: <Activity className="h-6 w-6 text-emerald-500" />, bg: "bg-emerald-50" },
  ];

  const quickActions = [
    { label: "Yeni Müşteri Ekle", href: "/admin/companies/new", icon: <Plus className="h-5 w-5" />, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Fiyatları Görüntüle", href: "/admin/pricing", icon: <Eye className="h-5 w-5" />, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Bayi Paneli</h1>
        <p className="mt-1 text-slate-500">
          Hoş geldiniz, <span className="font-medium">{username}</span>. Müşteri yönetimi ve fiyat bilgileri.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="border border-gray-200 shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Hızlı İşlemler</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <Card className="group border border-gray-200 shadow-sm hover:border-blue-200 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.bg} ${action.color}`}>
                      {action.icon}
                    </div>
                    <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">
                      {action.label}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-transform group-hover:translate-x-0.5" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
