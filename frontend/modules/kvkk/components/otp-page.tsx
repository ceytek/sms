"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { kvkkService } from "../services/kvkk.service";

export function KvkkOtpPage() {
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    setError("");
    setDone(false);
    try {
      const result = await kvkkService.sendOtp({ mobilePhone: phone, firstName, lastName });
      setChallengeId(result.challengeId);
      setDebugCode(result.debugCode ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kod gönderilemedi");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError("");
    try {
      await kvkkService.verifyOtp({ challengeId, code });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Doğrulama başarısız");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="space-y-1.5">
          <Label>Telefon Numarası</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0532..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Ad</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Soyad</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" disabled={busy || !phone.trim()} onClick={() => void send()}>Kod Gönder</Button>
        {challengeId && !done && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="space-y-1.5">
              <Label>Doğrulama Kodu</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6 haneli kod" />
            </div>
            {debugCode && <p className="text-xs text-amber-700">Geliştirme kodu: {debugCode}</p>}
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={busy || !code.trim()} onClick={() => void verify()}>Kodu Doğrula</Button>
          </div>
        )}
        {done && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">İzin Alındı</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
