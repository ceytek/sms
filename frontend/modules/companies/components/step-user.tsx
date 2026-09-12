"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompanyWizardData } from "../types";

interface StepUserProps {
  data: CompanyWizardData;
  onChange: (data: Partial<CompanyWizardData>) => void;
}

export function StepUser({ data, onChange }: StepUserProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-slate-700">Kullanıcı Hesabı</h3>
        <p className="text-sm text-slate-500">
          Firma için oluşturulacak giriş bilgilerini belirleyin. Firma kodu otomatik atanacaktır.
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center gap-2 text-sm text-blue-800">
          <KeyRound className="h-4 w-4" />
          <span>Firma kodu sistem tarafından otomatik oluşturulacaktır.</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="accountUsername">Kullanıcı Adı *</Label>
          <Input
            id="accountUsername"
            value={data.accountUsername}
            onChange={(e) => onChange({ accountUsername: e.target.value.trim() })}
            placeholder="Kullanıcı adı girin"
            autoComplete="off"
          />
          {data.accountUsername && data.accountUsername.length < 3 && (
            <p className="text-xs text-red-500">Kullanıcı adı en az 3 karakter olmalıdır</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountPassword">Şifre *</Label>
          <div className="relative">
            <Input
              id="accountPassword"
              type={showPassword ? "text" : "password"}
              value={data.accountPassword}
              onChange={(e) => onChange({ accountPassword: e.target.value })}
              placeholder="Şifre belirleyin"
              autoComplete="new-password"
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4 text-slate-400" /> : <Eye className="h-4 w-4 text-slate-400" />}
            </Button>
          </div>
          {data.accountPassword && data.accountPassword.length < 6 && (
            <p className="text-xs text-red-500">Şifre en az 6 karakter olmalıdır</p>
          )}
        </div>
      </div>
    </div>
  );
}
