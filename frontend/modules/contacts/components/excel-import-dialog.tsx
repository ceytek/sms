"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { contactImportsService } from "../services/imports.service";
import type {
  ContactDuplicatePolicy,
  ContactGroupRecord,
  ContactCustomFieldRecord,
  ContactImportColumnMapping,
  ImportJobRecord,
  ImportPreviewFile,
} from "../types";
import { DUPLICATE_POLICY_LABELS, ERROR_TYPE_LABELS, selectClass } from "../types";
import { ImportProgressOverlay, useImportProgress } from "./import-progress";

const FIELD_OPTIONS = [
  { key: "mobile", label: "Cep Telefonu", required: true },
  { key: "firstName", label: "Ad" },
  { key: "lastName", label: "Soyad" },
  { key: "email", label: "E-posta" },
  { key: "companyName", label: "Firma" },
  { key: "notes", label: "Not" },
  { key: "tag", label: "Etiket" },
];

function toImportMapping(
  mapping: Record<string, string>,
  customMapping: Record<string, string>,
): ContactImportColumnMapping {
  const customFields = Object.fromEntries(Object.entries(customMapping).filter(([, column]) => column));
  return {
    mobile: mapping.mobile,
    firstName: mapping.firstName,
    lastName: mapping.lastName,
    email: mapping.email,
    companyName: mapping.companyName,
    notes: mapping.notes,
    tag: mapping.tag,
    ...(Object.keys(customFields).length ? { customFields } : {}),
  };
}

export function ExcelImportDialog({
  groups,
  customFields = [],
  onClose,
  onDone,
}: {
  groups: ContactGroupRecord[];
  customFields?: ContactCustomFieldRecord[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState<"upload" | "map" | "preview">("upload");
  const [filePreview, setFilePreview] = useState<ImportPreviewFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({ mobile: "" });
  const [customMapping, setCustomMapping] = useState<Record<string, string>>({});
  const [job, setJob] = useState<ImportJobRecord | null>(null);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [policy, setPolicy] = useState<ContactDuplicatePolicy>("SKIP");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const importProgress = useImportProgress();
  const hasGroup = groupIds.length > 0 || newGroupName.trim().length > 0;

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const preview = await contactImportsService.previewFile(file);
      setFilePreview(preview);
      const guessed: Record<string, string> = { mobile: "" };
      for (const column of preview.columns) {
        const lower = column.toLowerCase();
        if (!guessed.mobile && /(tel|cep|gsm|phone|mobil)/.test(lower)) guessed.mobile = column;
        if (!guessed.firstName && /(ad|isim|name|first)/.test(lower)) guessed.firstName = column;
        if (!guessed.lastName && /(soyad|surname|last)/.test(lower)) guessed.lastName = column;
        if (!guessed.email && /mail/.test(lower)) guessed.email = column;
        if (!guessed.companyName && /(firma|sirket|company)/.test(lower)) guessed.companyName = column;
      }
      setMapping(guessed);
      const guessedCustom: Record<string, string> = {};
      for (const field of customFields.filter((item) => item.isActive)) {
        const match = preview.columns.find((column) => {
          const lower = column.toLowerCase();
          const name = field.name.toLowerCase();
          return lower === name || lower.includes(name);
        });
        if (match) guessedCustom[field.id] = match;
      }
      setCustomMapping(guessedCustom);
      setStep("map");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dosya okunamadı");
    } finally {
      setBusy(false);
    }
  };

  const analyze = async () => {
    if (!filePreview?.jobId || !mapping.mobile) return;
    setBusy(true);
    setError("");
    try {
      const result = await contactImportsService.analyze({
        jobId: filePreview.jobId,
        mapping: toImportMapping(mapping, customMapping),
      });
      setJob(result);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analiz başarısız");
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!filePreview?.jobId) return;
    if (!hasGroup) {
      setError("Aktarım için bir grup seçin veya yeni grup adı yazın");
      return;
    }
    setError("");
    try {
      await importProgress.run(() =>
        contactImportsService.commit({
          jobId: filePreview.jobId,
          mapping: toImportMapping(mapping, customMapping),
          duplicatePolicy: policy,
          groupIds,
          autoGroupName: newGroupName.trim() || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aktarım başarısız");
    }
  };

  return (
    <Modal title="Excel / CSV Aktar" onClose={importProgress.phase === "done" ? onDone : onClose} error={error} closable={importProgress.phase !== "running"}>
      <div className={step === "upload" ? "" : "hidden"}>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-10 text-sm text-slate-500 hover:border-blue-300">
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
          <Loader2 className={`h-6 w-6 animate-spin ${busy && step === "upload" ? "" : "hidden"}`} />
          <span className={busy && step === "upload" ? "hidden" : ""}>xlsx, xls veya csv dosyası seçin</span>
        </label>
      </div>
      {filePreview && (
        <div className={step === "map" ? "space-y-4" : "hidden"}>
          <p className="text-sm text-slate-500">{filePreview.fileName} · {filePreview.totalRows} satır</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELD_OPTIONS.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label>{field.label}{field.required ? " *" : ""}</Label>
                <select
                  className={selectClass}
                  value={mapping[field.key] ?? ""}
                  onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                >
                  <option value="">Eşleştirme</option>
                  {filePreview.columns.map((column) => (
                    <option key={column} value={column}>{column}</option>
                  ))}
                </select>
              </div>
            ))}
            {customFields.filter((item) => item.isActive).map((field) => (
              <div key={field.id} className="space-y-1.5">
                <Label>{field.name}</Label>
                <select
                  className={selectClass}
                  value={customMapping[field.id] ?? ""}
                  onChange={(e) => setCustomMapping({ ...customMapping, [field.id]: e.target.value })}
                >
                  <option value="">Eşleştirme</option>
                  {filePreview.columns.map((column) => (
                    <option key={column} value={column}>{column}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <GroupPicker
            groups={groups}
            groupIds={groupIds}
            newGroupName={newGroupName}
            inputId="excel-new-group-map"
            onToggle={(id) =>
              setGroupIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
            }
            onNewGroupName={setNewGroupName}
          />
          <div className="flex justify-end">
            <Button onClick={() => void analyze()} disabled={busy || !mapping.mobile || !hasGroup} className="bg-blue-600 hover:bg-blue-700">
              <Loader2 className={`mr-2 h-4 w-4 animate-spin ${busy && step === "map" ? "" : "hidden"}`} />
              Kontrol Et
            </Button>
          </div>
        </div>
      )}
      {job && (
        <div className={step === "preview" ? "space-y-4" : "hidden"}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Toplam" value={job.totalRows} />
            <Stat label="Geçerli" value={job.validRows} />
            <Stat label="Geçersiz" value={job.failedRows} />
            <Stat label="Mükerrer" value={job.duplicateRows} />
            <Stat label="Rehberde var" value={job.existingRows} />
          </div>
          <div className="space-y-1.5">
            <Label>Mükerrer kayıt</Label>
            <select className={selectClass} value={policy} onChange={(e) => setPolicy(e.target.value as ContactDuplicatePolicy)}>
              {Object.entries(DUPLICATE_POLICY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <GroupPicker
            groups={groups}
            groupIds={groupIds}
            newGroupName={newGroupName}
            inputId="excel-new-group-preview"
            onToggle={(id) =>
              setGroupIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
            }
            onNewGroupName={setNewGroupName}
          />
          {!!job.errors?.length && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 text-sm">
              {job.errors.slice(0, 50).map((item, index) => (
                <div key={index} className="border-b border-slate-100 px-3 py-2 last:border-0">
                  Satır {item.rowNumber}: {ERROR_TYPE_LABELS[item.errorType ?? ""] ?? item.errorMessage}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => void commit()} disabled={importProgress.phase === "running" || job.validRows === 0 || !hasGroup} className="bg-blue-600 hover:bg-blue-700">
              {job.validRows} Kişiyi Rehbere Aktar
            </Button>
          </div>
        </div>
      )}
      <ImportProgressOverlay
        phase={importProgress.phase}
        result={importProgress.result}
        onFinish={onDone}
      />
    </Modal>
  );
}

export function Modal({
  title,
  onClose,
  error,
  children,
  closable = true,
}: {
  title: string;
  onClose: () => void;
  error?: string;
  children: React.ReactNode;
  closable?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={!closable}
            className={`rounded-lg p-1 text-slate-400 hover:bg-slate-100 ${closable ? "" : "invisible"}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function GroupPicker({
  groups,
  groupIds,
  newGroupName,
  onToggle,
  onNewGroupName,
  inputId = "new-import-group",
}: {
  groups: ContactGroupRecord[];
  groupIds: string[];
  newGroupName: string;
  onToggle: (id: string) => void;
  onNewGroupName: (value: string) => void;
  inputId?: string;
}) {
  const activeGroups = groups.filter((item) => item.isActive || groupIds.includes(item.id));
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <Label>Grup *</Label>
      <p className="text-xs text-slate-500">Aktarılan kişiler en az bir gruba eklenmelidir.</p>
      <div className="flex flex-wrap gap-2">
        {activeGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => onToggle(group.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              groupIds.includes(group.id) ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {group.name}
          </button>
        ))}
        {!activeGroups.length && <span className="text-xs text-slate-400">Kayıtlı grup yok</span>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={inputId}>Yeni grup oluştur</Label>
        <Input
          id={inputId}
          value={newGroupName}
          onChange={(e) => onNewGroupName(e.target.value)}
          placeholder="Örn. Excel Aktarım"
        />
      </div>
    </div>
  );
}
