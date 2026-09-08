"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { authService } from "../services/auth.service";
import {
  Building2,
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Loader2,
} from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [companyCode, setCompanyCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await authService.login({
        companyCode,
        username,
        password,
      });

      if (response.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/customer");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Giriş yapılırken bir hata oluştu"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="companyCode" className="text-sm font-medium text-gray-700">
          Firma Kodu
        </Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="companyCode"
            type="text"
            placeholder="Firma kodunuzu girin"
            value={companyCode}
            onChange={(e) => setCompanyCode(e.target.value)}
            className="h-11 pl-10 text-sm"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="username" className="text-sm font-medium text-gray-700">
          Kullanıcı Adı
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="username"
            type="text"
            placeholder="Kullanıcı adınızı girin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="h-11 pl-10 text-sm"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-gray-700">
          Parola
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Parolanızı girin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 pl-10 pr-10 text-sm"
            required
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={rememberMe}
            onCheckedChange={(checked) => setRememberMe(checked === true)}
          />
          <span className="text-sm font-normal text-gray-600">
            Beni hatırla
          </span>
        </label>
        <button
          type="button"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          Parolamı unuttum?
        </button>
      </div>

      <Button
        type="submit"
        className="h-11 w-full bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium"
        size="lg"
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="mr-2 h-4 w-4" />
        )}
        Giriş Yap
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">veya</span>
        </div>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-center">
        <p className="text-sm text-blue-700">
          <span className="font-medium">Hesabınız yok mu?</span>{" "}
          Firma hesabı oluşturmak için bizimle iletişime geçin.
        </p>
      </div>
    </form>
  );
}
