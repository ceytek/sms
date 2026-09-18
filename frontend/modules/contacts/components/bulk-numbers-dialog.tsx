"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contactImportsService } from "../services/imports.service";
import type { ContactDuplicatePolicy, ContactGroupRecord, ImportJobRecord } from "../types";
import { DUPLICATE_POLICY_LABELS, ERROR_TYPE_LABELS, selectClass } from "../types";
import { GroupPicker, Modal, Stat } from "./excel-import-dialog";
import { ImportProgressOverlay, useImportProgress } from "./import-progress";

export function BulkNumbersDialog({
  groups,
  onClose,
  onDone,
}: {
  groups: ContactGroupRecord[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [numbers, setNumbers] = useState("");
  const [job, setJob] = useState<ImportJobRecord | null>(null);
  const [policy, setPolicy] = useState<ContactDuplicatePolicy>("SKIP");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const importProgress = useImportProgress();
  const hasGroup = groupIds.length > 0 || newGroupName.trim().length > 0;

  const analyze = async () => {
    setBusy(true);
    setError("");
    try {
      setJob(await contactImportsService.bulkPreview({ numbers, duplicatePolicy: policy }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kontrol başarısız");
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!job) return;
    if (!hasGroup) {
      setError("Aktarım için bir grup seçin veya yeni grup adı yazın");
      return;
    }
    setError("");
    try {
      await importProgress.run(() =>
        contactImportsService.commit({
          jobId: job.id,
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
    <Modal title="Toplu Numara Ekle" onClose={importProgress.phase === "done" ? onDone : onClose} error={error} closable={importProgress.phase !== "running"}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Numaralar</Label>
          <Textarea rows={8} value={numbers} onChange={(e) => setNumbers(e.target.value)} placeholder={"05321112233\n05332223344"} />
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
          onToggle={(id) =>
            setGroupIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
          }
          onNewGroupName={setNewGroupName}
        />
        <Button variant="outline" onClick={() => void analyze()} disabled={busy || !numbers.trim()}>
          <Loader2 className={`mr-2 h-4 w-4 animate-spin ${busy ? "" : "hidden"}`} />
          Numaraları Kontrol Et
        </Button>
        {job && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Stat label="Toplam" value={job.totalRows} />
              <Stat label="Geçerli" value={job.validRows} />
              <Stat label="Geçersiz" value={job.failedRows} />
              <Stat label="Mükerrer" value={job.duplicateRows} />
              <Stat label="Rehberde var" value={job.existingRows} />
            </div>
            {!!job.errors?.length && (
              <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 text-sm">
                {job.errors.slice(0, 40).map((item, index) => (
                  <div key={index} className="border-b border-slate-100 px-3 py-2 last:border-0">
                    Satır {item.rowNumber}: {ERROR_TYPE_LABELS[item.errorType ?? ""] ?? item.errorMessage}
                  </div>
                ))}
              </div>
            )}
            <Button onClick={() => void commit()} disabled={importProgress.phase === "running" || job.validRows === 0 || !hasGroup} className="bg-blue-600 hover:bg-blue-700">
              {job.validRows} Numarayı Ekle
            </Button>
          </>
        )}
      </div>
      <ImportProgressOverlay
        phase={importProgress.phase}
        result={importProgress.result}
        onFinish={onDone}
      />
    </Modal>
  );
}
