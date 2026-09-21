"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Mail, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notificationsService } from "@/modules/notifications";
import type { GeneratedCredentials } from "../types";

type ChannelState = "idle" | "sending" | "sent" | "error";

export function CredentialsSuccessDialog({
  companyId,
  mobile,
  email,
  credentials,
  onGoToList,
}: {
  companyId: string;
  mobile?: string;
  email?: string;
  credentials: GeneratedCredentials;
  onGoToList: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [smsState, setSmsState] = useState<ChannelState>("idle");
  const [emailState, setEmailState] = useState<ChannelState>("idle");
  const [smsMessage, setSmsMessage] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [canSendSms, setCanSendSms] = useState(false);
  const [smsDisabledReason, setSmsDisabledReason] = useState("");
  const [smsChecked, setSmsChecked] = useState(false);

  useEffect(() => {
    void notificationsService
      .credentialsStatus()
      .then((status) => {
        setCanSendSms(status.canSendSms);
        setSmsDisabledReason(status.smsDisabledReason ?? "");
      })
      .catch(() => {
        setCanSendSms(false);
        setSmsDisabledReason("SMS göndermek için aktif bir originatör gerekli");
      })
      .finally(() => setSmsChecked(true));
  }, []);

  const copyToClipboard = () => {
    const text = [
      `Firma Kodu: ${credentials.companyCode}`,
      `Kullanıcı Adı: ${credentials.username}`,
      `Şifre: ${credentials.password}`,
      `Rol: ${credentials.role === "DEALER" ? "Bayi" : "Müşteri"}`,
    ].join("\n");
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const send = async (channel: "SMS" | "EMAIL") => {
    const setState = channel === "SMS" ? setSmsState : setEmailState;
    const setMessage = channel === "SMS" ? setSmsMessage : setEmailMessage;
    setState("sending");
    setMessage("");
    try {
      const result = await notificationsService.sendAccountCredentials({
        companyId,
        channel,
        password: credentials.password,
      });
      setState("sent");
      setMessage(result.message);
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Gönderilemedi");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-5 w-5 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Firma Başarıyla Oluşturuldu</h2>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Aşağıdaki giriş bilgilerini kaydedin. Şifre bir daha gösterilmeyecektir.
        </p>

        <div className="space-y-3 rounded-lg bg-slate-50 p-4">
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Firma Kodu</span>
            <span className="font-mono font-medium">{credentials.companyCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Kullanıcı Adı</span>
            <span className="font-mono font-medium">{credentials.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Şifre</span>
            <span className="font-mono font-medium">{credentials.password}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Rol</span>
            <span className="font-medium">{credentials.role === "DEALER" ? "Bayi" : "Müşteri"}</span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-slate-500">Giriş bilgilerini gönder</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!mobile || !canSendSms || smsState === "sending"}
              onClick={() => void send("SMS")}
            >
              {smsState === "sending" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Smartphone className="mr-2 h-4 w-4" />
              )}
              {smsState === "sent" ? "SMS gitti" : "SMS"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!email || emailState === "sending"}
              onClick={() => void send("EMAIL")}
            >
              {emailState === "sending" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              {emailState === "sent" ? "E-posta gitti" : "E-posta"}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            SMS: {mobile || "cep telefonu girilmedi"} · E-posta: {email || "e-posta girilmedi"}
          </p>
          {smsChecked && !canSendSms && (
            <p className="text-xs text-amber-700">{smsDisabledReason}</p>
          )}
          {(smsMessage || emailMessage) && (
            <div className="space-y-1 text-xs">
              {smsMessage && (
                <p className={smsState === "error" ? "text-red-600" : "text-emerald-700"}>{smsMessage}</p>
              )}
              {emailMessage && (
                <p className={emailState === "error" ? "text-red-600" : "text-emerald-700"}>{emailMessage}</p>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={copyToClipboard} className="flex-1">
            <Copy className="mr-2 h-4 w-4" />
            {copied ? "Kopyalandı!" : "Kopyala"}
          </Button>
          <Button onClick={onGoToList} className="flex-1 bg-blue-600 hover:bg-blue-700">
            Firma Listesine Git
          </Button>
        </div>
      </div>
    </div>
  );
}
