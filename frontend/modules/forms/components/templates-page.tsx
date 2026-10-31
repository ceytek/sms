"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Trash2 } from "lucide-react";
import { formService } from "../services/form.service";
import type { FormField } from "../types";

type Template = { id: string; name: string; description: string; category: string; isSystem: boolean; fields: FormField[] };

export function FormTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState("");

  const load = () => { formService.templates().then(setTemplates).catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi")); };
  useEffect(() => { load(); }, []);

  const useTemplate = (id: string) => {
    formService.createFromTemplate(id).then((f) => router.push(`/customer/forms/${f.id}?step=1`)).catch((e) => setError(e instanceof Error ? e.message : "Hata"));
  };

  const remove = (id: string) => {
    formService.templates().then(() => formService.list()); // dummy
    // Actually delete
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/forms/templates/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("accessToken") || "" : ""}` },
    }).then(load).catch(() => {});
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Form Şablonları</h1>
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <div key={t.id} className="rounded-xl border bg-white p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50"><FileText className="h-5 w-5 text-blue-600" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{t.name}</h3>
                <p className="text-xs text-slate-500">{t.category} · {t.fields.length} alan</p>
              </div>
              {t.isSystem && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Sistem</span>}
            </div>
            {t.description && <p className="text-xs text-slate-600 line-clamp-2">{t.description}</p>}
            <div className="flex items-center gap-2">
              <button onClick={() => useTemplate(t.id)} className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-medium text-white hover:bg-blue-700">
                <Plus className="mr-1 inline h-3.5 w-3.5" /> Kullan
              </button>
              {!t.isSystem && (
                <button onClick={() => remove(t.id)} className="rounded-lg border p-2 text-red-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
        {!templates.length && <p className="col-span-full text-center text-slate-400 py-8">Şablon bulunamadı</p>}
      </div>
    </div>
  );
}
