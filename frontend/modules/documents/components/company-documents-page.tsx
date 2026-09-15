"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { documentsService } from "../services/documents.service";
import {
  DOCUMENT_PROCESS_LABELS,
  DOCUMENT_STATUS_LABELS,
  type CompanyDocumentItem,
  type CompanyDocumentsPayload,
  type DocumentStatus,
} from "../types";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm";

function statusClass(status: DocumentStatus) {
  if (status === "available") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "missing") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export function CompanyDocumentsPage({ companyId }: { companyId: string }) {
  const [data, setData] = useState<CompanyDocumentsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [customName, setCustomName] = useState("");
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [missingNote, setMissingNote] = useState<{ key: string; value: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<{ documentId?: string; documentTypeId?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await documentsService.getCompanyDocuments(companyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evraklar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyPayload = (payload: CompanyDocumentsPayload) => {
    setData(payload);
  };

  const changeStatus = async (item: CompanyDocumentItem, status: DocumentStatus) => {
    if (status === "missing") {
      setMissingNote({
        key: item.id ?? item.documentTypeId ?? item.name,
        value: item.missingDescription ?? "",
      });
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = await documentsService.updateItem(companyId, {
        id: item.id ?? undefined,
        documentTypeId: item.documentTypeId ?? undefined,
        status,
      });
      applyPayload(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Durum güncellenemedi");
    } finally {
      setBusy(false);
    }
  };

  const saveMissing = async (item: CompanyDocumentItem) => {
    const note = missingNote?.value.trim() ?? "";
    if (!note) {
      setError("Eksiklik açıklaması zorunludur");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = await documentsService.updateItem(companyId, {
        id: item.id ?? undefined,
        documentTypeId: item.documentTypeId ?? undefined,
        status: "missing",
        missingDescription: note,
      });
      applyPayload(payload);
      setMissingNote(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Durum güncellenemedi");
    } finally {
      setBusy(false);
    }
  };

  const pickFile = (item: CompanyDocumentItem) => {
    uploadTarget.current = {
      documentId: item.id ?? undefined,
      documentTypeId: item.documentTypeId ?? undefined,
    };
    fileRef.current?.click();
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !uploadTarget.current) return;
    setBusy(true);
    setError("");
    try {
      const payload = await documentsService.upload(companyId, file, uploadTarget.current);
      applyPayload(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dosya yüklenemedi");
    } finally {
      setBusy(false);
      uploadTarget.current = null;
    }
  };

  const viewFile = async (item: CompanyDocumentItem) => {
    if (!item.id) return;
    try {
      const url = await documentsService.viewFile(companyId, item.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dosya açılamadı");
    }
  };

  const removeFile = async (item: CompanyDocumentItem) => {
    if (!item.id) return;
    setBusy(true);
    try {
      applyPayload(await documentsService.deleteFile(companyId, item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dosya silinemedi");
    } finally {
      setBusy(false);
    }
  };

  const addCustom = async () => {
    const name = customName.trim();
    if (!name) return;
    setBusy(true);
    setError("");
    try {
      await documentsService.addCustom(companyId, name);
      setCustomName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ek belge eklenemedi");
    } finally {
      setBusy(false);
    }
  };

  const removeCustom = async (item: CompanyDocumentItem) => {
    if (!item.id) return;
    setBusy(true);
    try {
      applyPayload(await documentsService.deleteCustom(companyId, item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Belge silinemedi");
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    setBusy(true);
    setError("");
    try {
      applyPayload(await documentsService.complete(companyId));
      setConfirmComplete(false);
    } catch (err) {
      setConfirmComplete(false);
      setError(err instanceof Error ? err.message : "Süreç tamamlanamadı");
    } finally {
      setBusy(false);
    }
  };

  const renderRows = (items: CompanyDocumentItem[], custom = false) =>
    items.map((item) => {
      const key = item.id ?? item.documentTypeId ?? item.name;
      const editingMissing = missingNote?.key === key;
      return (
        <TableRow key={key}>
          <TableCell>
            <p className="font-medium text-slate-800">{item.name}</p>
            {item.description && <p className="text-xs text-slate-500">{item.description}</p>}
            {item.status === "missing" && item.missingDescription && (
              <p className="mt-1 text-xs text-red-600">{item.missingDescription}</p>
            )}
            {editingMissing && (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={missingNote.value}
                  onChange={(event) => setMissingNote({ key, value: event.target.value })}
                  placeholder="İmza eksik, kaşe eksik, tarihi geçmiş..."
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setMissingNote(null)}>
                    İptal
                  </Button>
                  <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => void saveMissing(item)}>
                    Kaydet
                  </Button>
                </div>
              </div>
            )}
          </TableCell>
          <TableCell>{item.isRequired ? "Zorunlu" : "Opsiyonel"}</TableCell>
          <TableCell>
            <select
              className={selectClass}
              value={item.status}
              disabled={busy}
              onChange={(event) => void changeStatus(item, event.target.value as DocumentStatus)}
            >
              {Object.entries(DOCUMENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass(item.status)}`}>
              {DOCUMENT_STATUS_LABELS[item.status]}
            </span>
          </TableCell>
          <TableCell className="text-sm text-slate-600">{item.fileName || "—"}</TableCell>
          <TableCell>
            <div className="flex flex-wrap justify-end gap-1">
              <Button size="sm" variant="outline" onClick={() => pickFile(item)} disabled={busy}>
                <Upload className="mr-1 h-3.5 w-3.5" />
                {item.fileName ? "Değiştir" : "Yükle"}
              </Button>
              {item.id && item.fileName && (
                <Button size="sm" variant="outline" onClick={() => void viewFile(item)}>
                  <Eye className="mr-1 h-3.5 w-3.5" />
                  Görüntüle
                </Button>
              )}
              {item.id && item.fileName && (
                <Button size="sm" variant="outline" onClick={() => void removeFile(item)} disabled={busy}>
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </Button>
              )}
              {custom && item.id && (
                <Button size="sm" variant="outline" onClick={() => void removeCustom(item)} disabled={busy}>
                  Belgeyi Sil
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      );
    });

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const completed = data?.process.status === "completed";

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-5">
      <input ref={fileRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={onFile} />

      {confirmComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Evrak sürecini tamamla</h2>
            <p className="mt-2 text-sm text-slate-600">
              Zorunlu belgeler kontrol edilecek. Opsiyonel belgeler tamamlamayı engellemez.
            </p>
            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmComplete(false)} disabled={busy}>
                İptal
              </Button>
              <Button className="flex-1 bg-blue-600 text-white hover:bg-blue-700" onClick={() => void complete()} disabled={busy}>
                {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Tamamla
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href={`/admin/companies/${companyId}`} className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Firma detayına dön
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Firma Evrakları</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data?.companyName}
            {data?.subcategoryName ? ` · ${data.categoryName} → ${data.subcategoryName}` : ""}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-400">Evrak Süreci</p>
          <p className={`text-base font-bold ${completed ? "text-emerald-700" : "text-amber-700"}`}>
            {data ? DOCUMENT_PROCESS_LABELS[data.process.status] : "—"}
          </p>
          <p className="text-xs text-slate-500">
            {data ? `${data.summary.availableCount} / ${data.summary.totalCount} belge mevcut` : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 whitespace-pre-wrap">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-800">Standart Belgeler</h2>
        </div>
        {!data?.standard.length ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">
            Bu ana kategori için tanımlı standart belge yok. Belge Tanımları üzerinden eşleştirme yapın.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Belge</TableHead>
                <TableHead>Zorunluluk</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Dosya</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{renderRows(data.standard)}</TableBody>
          </Table>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-800">Firmaya Özel Belgeler</h2>
        </div>
        <div className="flex gap-2 border-b border-slate-100 p-4">
          <Input
            value={customName}
            onChange={(event) => setCustomName(event.target.value)}
            placeholder="Ek Protokol, Özel Yetki Yazısı..."
          />
          <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => void addCustom()} disabled={busy}>
            <Plus className="mr-1.5 h-4 w-4" />
            Ek Belge Ekle
          </Button>
        </div>
        {!data?.custom.length ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Bu firmaya özel belge yok.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Belge</TableHead>
                <TableHead>Zorunluluk</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Dosya</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{renderRows(data.custom, true)}</TableBody>
          </Table>
        )}
      </section>

      <div className="flex justify-end">
        <Button
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={busy || completed}
          onClick={() => setConfirmComplete(true)}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {completed ? "Süreç Tamamlandı" : "Evrak Sürecini Tamamla"}
        </Button>
      </div>
    </div>
  );
}
