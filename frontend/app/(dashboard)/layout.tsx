"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/modules/auth";
import { Send, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const user = authService.getUser();
    if (!authService.isAuthenticated() || !user) {
      router.push("/");
      return;
    }
    setUserName(user.username);
    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    authService.logout();
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
              <Send className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">Toplu SMS</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              Merhaba, <span className="font-medium">{userName}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-sm"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Çıkış Yap
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main>{children}</main>
    </div>
  );
}
