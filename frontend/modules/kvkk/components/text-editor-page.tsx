"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { kvkkService } from "../services/kvkk.service";
import type { KvkkTextDocument } from "../types";
import { RichTextEditor } from "./rich-text-editor";

export function KvkkTextEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === "new";
  const [document, setDocument] = useState<KvkkTextDocument | null>(null);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p></p>");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    void kvkkService
      .getText(params.id)
      .then((item) => {
        setDocument(item);
        setName(item.name);
        setTitle(item.currentVersion?.title ?? "");
        setBodyHtml(item.currentVersion?.bodyHtml ?? "<p></p>");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Metin yüklenemedi"));
  }, [isNew, params.id]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      if (isNew) {
        await kvkkService.createText({ name, title, bodyHtml });
      } else {
        if (name.trim() && name.trim() !== document?.name) {
          await kvkkService.updateText(params.id, { name });
        }
        await kvkkService.publishText(params.id, { title, bodyHtml });
      }
      router.push("/customer/kvkk/texts");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
      <Link href="/customer/kvkk/texts" className="mb-4 inline-block text-sm text-blue-600">← Metin listesi</Link>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{isNew ? "Yeni Metin" : "Metni Düzenle"}</h1>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        {!isNew && document && (
          <p className="text-sm text-slate-500">Kayıt yeni versiyon olarak saklanır. Şu an v{document.currentVersion?.version}.</p>
        )}
        <div className="space-y-1.5">
          <Label>Metin adı</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Genel Aydınlatma" />
        </div>
        <div className="space-y-1.5">
          <Label>Başlık</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Metin</Label>
          <RichTextEditor value={bodyHtml} onChange={setBodyHtml} />
        </div>
        {!isNew && document && (
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            {document.versions.map((version) => (
              <span key={version.id} className={`rounded-full px-2 py-0.5 ${version.isCurrent ? "bg-blue-50 text-blue-700" : "bg-slate-100"}`}>
                v{version.version}
              </span>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button className="bg-blue-600 hover:bg-blue-700" disabled={saving || !title.trim() || !name.trim()} onClick={() => void save()}>
          {isNew ? "Metin Oluştur" : "Yeni Versiyon Yayınla"}
        </Button>
      </div>
    </div>
  );
}
