"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Tags, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  referenceService,
  type CustomerCategory,
} from "@/modules/companies/services/reference.service";
import { documentsService } from "../services/documents.service";
import type { DocumentTypeAssignment, DocumentTypeRecord } from "../types";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

type EditorState = {
  id?: string;
  name: string;
  description: string;
  isRequired: boolean;
  isActive: boolean;
  appliesToAll: boolean;
  sortOrder: string;
  assignments: DocumentTypeAssignment[];
};

const emptyEditor = (): EditorState => ({
  name: "",
  description: "",
  isRequired: true,
  isActive: true,
  appliesToAll: false,
  sortOrder: "0",
  assignments: [],
});

export function DocumentTypesManager() {
  const [types, setTypes] = useState<DocumentTypeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [categories, setCategories] = useState<CustomerCategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [assignmentRequired, setAssignmentRequired] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [items, cats] = await Promise.all([
        documentsService.listTypes(),
        referenceService.getCustomerCategories(),
      ]);
      setTypes(items);
      setCategories(cats.filter((item) => item.isActive));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Belge türleri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditor(emptyEditor());
    setCategoryId("");
    setAssignmentRequired(true);
  };

  const openEdit = (item: DocumentTypeRecord) => {
    setEditor({
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      isRequired: item.isRequired,
      isActive: item.isActive,
      appliesToAll: item.appliesToAll,
      sortOrder: String(item.sortOrder),
      assignments: item.assignments,
    });
    setCategoryId("");
    setAssignmentRequired(true);
  };

  const addAssignment = () => {
    if (!editor) return;
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return;
    if (editor.assignments.some((item) => item.categoryId === category.id)) return;
    setEditor({
      ...editor,
      assignments: [
        ...editor.assignments,
        {
          id: category.id,
          categoryId: category.id,
          categoryName: category.name,
          isRequired: assignmentRequired,
        },
      ],
    });
    setCategoryId("");
  };

  const save = async () => {
    if (!editor) return;
    const name = editor.name.trim();
    if (!name) {
      setError("Belge adı zorunludur");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name,
        description: editor.description.trim() || undefined,
        isRequired: editor.isRequired,
        isActive: editor.isActive,
        appliesToAll: editor.appliesToAll,
        sortOrder: Number(editor.sortOrder) || 0,
        assignments: editor.appliesToAll
          ? []
          : editor.assignments.map((item) => ({
              categoryId: item.categoryId,
              isRequired: item.isRequired,
            })),
      };
      if (editor.id) {
        await documentsService.updateType(editor.id, payload);
      } else {
        await documentsService.createType(payload);
      }
      setEditor(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Belge Tanımları</h1>
          <p className="mt-1 text-sm text-slate-500">
            Firma türlerine göre istenen evrakları tanımlayın. Eşleştirme ana kategori bazındadır.
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Belge
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Belge</TableHead>
                <TableHead>Zorunluluk</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Ana Kategori</TableHead>
                <TableHead>Sıra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() => openEdit(item)}
                >
                  <TableCell>
                    <p className="font-medium text-slate-800">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-slate-500">{item.description}</p>
                    )}
                  </TableCell>
                  <TableCell>{item.isRequired ? "Zorunlu" : "Opsiyonel"}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                        item.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      {item.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {item.appliesToAll
                      ? "Tüm kategoriler"
                      : item.assignments.length
                        ? item.assignments.map((row) => row.categoryName).join(", ")
                        : "Atanmamış"}
                  </TableCell>
                  <TableCell>{item.sortOrder}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {editor && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {editor.id ? "Belgeyi Düzenle" : "Yeni Belge"}
              </h2>
              <button onClick={() => setEditor(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="docName">Belge Adı</Label>
                <Input
                  id="docName"
                  value={editor.name}
                  onChange={(event) => setEditor({ ...editor, name: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="docDesc">Açıklama</Label>
                <Textarea
                  id="docDesc"
                  value={editor.description}
                  onChange={(event) => setEditor({ ...editor, description: event.target.value })}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editor.isRequired}
                    onChange={(event) => setEditor({ ...editor, isRequired: event.target.checked })}
                  />
                  Zorunlu
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editor.isActive}
                    onChange={(event) => setEditor({ ...editor, isActive: event.target.checked })}
                  />
                  Aktif
                </label>
                <div className="space-y-1">
                  <Label htmlFor="docOrder">Sıralama</Label>
                  <Input
                    id="docOrder"
                    value={editor.sortOrder}
                    onChange={(event) => setEditor({ ...editor, sortOrder: event.target.value })}
                  />
                </div>
              </div>

              <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={editor.appliesToAll}
                  onChange={(event) =>
                    setEditor({ ...editor, appliesToAll: event.target.checked })
                  }
                />
                <span>
                  <span className="font-medium">Tüm ana kategoriler için geçerli</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    İşaretlenirse tek tek kategori eklemenize gerek kalmaz. Zorunluluk yukarıdaki işarete göre uygulanır.
                  </span>
                </span>
              </label>

              {!editor.appliesToAll && (
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-3 text-sm font-medium text-slate-800">Ana kategori eşleştirme</p>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <div className="space-y-1">
                    <Label>Ana Kategori</Label>
                    <select
                      className={selectClass}
                      value={categoryId}
                      onChange={(event) => setCategoryId(event.target.value)}
                    >
                      <option value="">Seçiniz</option>
                      {categories.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex h-9 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={assignmentRequired}
                      onChange={(event) => setAssignmentRequired(event.target.checked)}
                    />
                    Zorunlu
                  </label>
                  <Button type="button" variant="outline" onClick={addAssignment}>
                    Ekle
                  </Button>
                </div>

                <div className="mt-4 space-y-2">
                  {editor.assignments.length === 0 ? (
                    <p className="text-sm text-slate-500">Henüz ana kategori eklenmedi.</p>
                  ) : (
                    editor.assignments.map((item) => (
                      <div
                        key={item.categoryId}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <Tags className="h-4 w-4 text-blue-600" />
                          <span>{item.categoryName}</span>
                          <span className="text-xs text-slate-500">
                            {item.isRequired ? "Zorunlu" : "Opsiyonel"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setEditor({
                              ...editor,
                              assignments: editor.assignments.filter(
                                (row) => row.categoryId !== item.categoryId,
                              ),
                            })
                          }
                          className="rounded p-1 text-red-500 hover:bg-white"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditor(null)} disabled={saving}>
                İptal
              </Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => void save()} disabled={saving}>
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
