"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { authService } from "@/modules/auth";
import type { User } from "@/modules/auth";
import { recoverLegacyImpersonation } from "@/lib/session";
import {
  Home,
  Building2,
  CreditCard,
  Radio,
  Users,
  Send,
  BarChart3,
  MapPin,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    recoverLegacyImpersonation();
    const currentUser = authService.getUser();
    if (!authService.isAuthenticated() || !currentUser) {
      router.push("/");
      return;
    }
    setUser(currentUser);
    setIsLoading(false);
  }, [router, pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    authService.logout();
    router.push("/");
  };

  const handleExitImpersonation = () => {
    authService.exitImpersonation();
  };

  const impersonating = authService.isImpersonating();
  const originalUser = impersonating ? authService.getOriginalUser() : null;

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  const adminNavItems: NavItem[] = [
    { label: "Dashboard", href: "/admin", icon: <Home className="h-5 w-5" /> },
    { label: "Firma Yönetimi", href: "/admin/companies", icon: <Building2 className="h-5 w-5" /> },
    { label: "Harita", href: "/admin/map", icon: <MapPin className="h-5 w-5" /> },
    { label: "Fiyat Yönetimi", href: "/admin/pricing", icon: <CreditCard className="h-5 w-5" /> },
    { label: "SMS Sağlayıcılar", href: "/admin/providers", icon: <Radio className="h-5 w-5" /> },
  ];

  const dealerNavItems: NavItem[] = [
    { label: "Dashboard", href: "/admin", icon: <Home className="h-5 w-5" /> },
    { label: "Müşteri Yönetimi", href: "/admin/companies", icon: <Building2 className="h-5 w-5" /> },
    { label: "Harita", href: "/admin/map", icon: <MapPin className="h-5 w-5" /> },
    { label: "Fiyat Görüntüleme", href: "/admin/pricing", icon: <CreditCard className="h-5 w-5" /> },
  ];

  const navItems = user?.role === "DEALER" ? dealerNavItems : adminNavItems;

  const placeholderItems: NavItem[] =
    user?.role === "ADMIN"
      ? [
          { label: "Kullanıcı Yönetimi", href: "#", icon: <Users className="h-5 w-5" />, disabled: true },
          { label: "SMS Yönetimi", href: "#", icon: <Send className="h-5 w-5" />, disabled: true },
          { label: "Raporlar", href: "#", icon: <BarChart3 className="h-5 w-5" />, disabled: true },
        ]
      : [];

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (user?.role === "CUSTOMER") {
    return (
      <div className="flex min-h-screen flex-col">
        {impersonating && (
          <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm text-white">
            <span>
              <strong>{originalUser?.username}</strong> olarak{" "}
              <strong>{user.companyCode}</strong> / {user.username} hesabına giriş yaptınız
            </span>
            <button
              onClick={handleExitImpersonation}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1 font-medium hover:bg-white/30"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Bu Sekmeyi Kapat
            </button>
          </div>
        )}
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
              <Send className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">Toplu SMS</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              Merhaba, <span className="font-medium">{user.username}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-sm"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              {impersonating ? "Bu Hesabı Kapat" : "Çıkış Yap"}
            </Button>
          </div>
        </header>
        <main className="flex-1 bg-gray-50">{children}</main>
      </div>
    );
  }

  const sidebarWidth = collapsed ? "w-16" : "w-60";

  const renderNavItem = (item: NavItem) => {
    const active = !item.disabled && isActive(item.href);
    const baseClasses =
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors";
    const activeClasses = "bg-slate-800 text-white";
    const inactiveClasses = "text-slate-400 hover:bg-slate-800 hover:text-white";
    const disabledClasses = "text-slate-600 cursor-not-allowed";

    const classes = `${baseClasses} ${
      item.disabled ? disabledClasses : active ? activeClasses : inactiveClasses
    }`;

    if (item.disabled) {
      return (
        <div key={item.label} className={classes} title={item.label}>
          {item.icon}
          {!collapsed && <span>{item.label}</span>}
        </div>
      );
    }

    return (
      <Link key={item.label} href={item.href} className={classes} title={item.label}>
        {item.icon}
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  };

  const sidebarContent = (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {navItems.map(renderNavItem)}
      {placeholderItems.length > 0 && (
        <>
          <div className="my-2 border-t border-slate-700" />
          {placeholderItems.map(renderNavItem)}
        </>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col">
      {impersonating && (
        <div className="flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm text-white">
          <span>
            <strong>{originalUser?.username}</strong> olarak{" "}
            <strong>{user?.companyCode}</strong> / {user?.username} hesabına giriş yaptınız
          </span>
          <button
            onClick={handleExitImpersonation}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1 font-medium hover:bg-white/30"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
              Bu Sekmeyi Kapat
          </button>
        </div>
      )}
    <div className="flex min-h-0 flex-1">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col ${sidebarWidth} bg-slate-900 text-white transition-all duration-300 ease-in-out flex-shrink-0`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-700 px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
                <Send className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold">Toplu SMS</span>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
              <Send className="h-4 w-4 text-white" />
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto">{sidebarContent}</div>

        {/* Collapse Toggle */}
        <div className="border-t border-slate-700 p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span>Daralt</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 text-white flex flex-col">
            <div className="flex h-16 items-center justify-between border-b border-slate-700 px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
                  <Send className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold">Toplu SMS</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-gray-100 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-lg font-bold text-slate-900 md:hidden">Toplu SMS</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm text-slate-600">
              Merhaba, <span className="font-medium">{user?.username}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-sm"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              {impersonating ? "Bu Hesabı Kapat" : "Çıkış Yap"}
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 bg-gray-50">{children}</main>
      </div>
    </div>
    </div>
  );
}
