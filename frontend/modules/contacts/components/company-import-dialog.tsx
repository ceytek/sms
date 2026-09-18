"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { contactImportsService } from "../services/imports.service";
import {
  referenceService,
  type CustomerCategory,
  type CustomerSubcategory,
} from "@/modules/companies/services/reference.service";
import type { CompanySourceItem, ContactDuplicatePolicy, ContactGroupRecord, ImportJobRecord } from "../types";
import { DUPLICATE_POLICY_LABELS, ERROR_TYPE_LABELS, selectClass } from "../types";
import { Modal, Stat } from "./excel-import-dialog";
import { ImportProgressOverlay, useImportProgress } from "./import-progress";

export function CompanyImportDialog({
  groups,
  onClose,
  onDone,
}: {
  groups: ContactGroupRecord[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [categories, setCategories] = useState<CustomerCategory[]>([]);
  const [subcategories, setSubcategories] = useState<CustomerSubcategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<CompanySourceItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [job, setJob] = useState<ImportJobRecord | null>(null);
  const [policy, setPolicy] = useState<ContactDuplicatePolicy>("SKIP");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [autoGroupName, setAutoGroupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const importProgress = useImportProgress();

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const result = await contactImportsService.companySources({
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId || undefined,
        search: search || undefined,
      });
      setItems(result.items);
      setSelected(result.items.map((item) => item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Firmalar yüklenemedi");
    } finally {
      setBusy(false);
    }
  }, [categoryId, subcategoryId, search]);

  useEffect(() => {
    void referenceService.getCustomerCategories().then((list) => setCategories(list.filter((item) => item.isActive)));
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    void referenceService.getCustomerSubcategories(categoryId).then((list) => setSubcategories(list.filter((item) => item.isActive)));
  }, [categoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const preview = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await contactImportsService.previewCompanies({
        companyIds: selected,
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId || undefined,
        duplicatePolicy: policy,
      });
      setJob(result);
      const category = categories.find((item) => item.id === categoryId);
      if (category && !autoGroupName) setAutoGroupName(category.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Önizleme başarısız");
    } finally {
      setBusy(false);
    }
  };

  const commit = async () => {
    if (!job) return;
    setError("");
    try {
      await importProgress.run(() =>
        contactImportsService.commit({
          jobId: job.id,
          duplicatePolicy: policy,
          groupIds,
          autoGroupName: autoGroupName || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aktarım başarısız");
    }
  };

  return (
    <Modal title="Firma Kayıtlarından Aktar" onClose={importProgress.phase === "done" ? onDone : onClose} error={error} closable={importProgress.phase !== "running"}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <select className={selectClass} value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubcategoryId(""); }}>
            <option value="">Tüm kategoriler</option>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select className={selectClass} value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} disabled={!categoryId}>
            <option value="">Tüm alt kategoriler</option>
            {subcategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <Input placeholder="Firma ara" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
          {items.map((item) => (
            <label key={item.id} className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-0">
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={(e) => setSelected((current) => e.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))}
              />
              <span className="flex-1 font-medium text-slate-800">{item.name}</span>
              <span className="text-slate-500">{item.mobile || "Telefon yok"}</span>
            </label>
          ))}
          {!items.length && <p className="p-4 text-sm text-slate-400">Aktarılacak firma bulunamadı</p>}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Grup</Label>
            <select className={selectClass} value={groupIds[0] ?? ""} onChange={(e) => setGroupIds(e.target.value ? [e.target.value] : [])}>
              <option value="">Seçilmedi</option>
              {groups.filter((item) => item.isActive).map((group) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Otomatik grup adı</Label>
            <Input value={autoGroupName} onChange={(e) => setAutoGroupName(e.target.value)} placeholder="Eczaneler" />
          </div>
          <div className="space-y-1.5">
            <Label>Mükerrer</Label>
            <select className={selectClass} value={policy} onChange={(e) => setPolicy(e.target.value as ContactDuplicatePolicy)}>
              {Object.entries(DUPLICATE_POLICY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <Button variant="outline" onClick={() => void preview()} disabled={busy || selected.length === 0}>
          <Loader2 className={`mr-2 h-4 w-4 animate-spin ${busy ? "" : "hidden"}`} />
          {selected.length} Firmayı Kontrol Et
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
              <div className="max-h-28 overflow-y-auto rounded-lg border border-slate-200 text-sm">
                {job.errors.slice(0, 30).map((item, index) => (
                  <div key={index} className="border-b border-slate-100 px-3 py-2 last:border-0">
                    {ERROR_TYPE_LABELS[item.errorType ?? ""] ?? item.errorMessage}
                  </div>
                ))}
              </div>
            )}
            <Button onClick={() => void commit()} disabled={importProgress.phase === "running" || job.validRows === 0} className="bg-blue-600 hover:bg-blue-700">
              Rehbere Aktar
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
