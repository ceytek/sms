"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Loader2,
  MessageSquare,
  Phone,
  Plus,
  Send,
  Tags,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  CustomerCategory,
  CustomerSubcategory,
  referenceService,
} from "@/modules/companies/services/reference.service";
import { messagingService } from "../services/messaging.service";
import { smsEncodingAndParts, smsProgress } from "../sms-text";
import type { BasketItem, MessagingPreview } from "../types";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const PAGE_SIZE = 20;
const MAX_BODY = 2000;

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function BulkMessagePage() {
  const [categories, setCategories] = useState<CustomerCategory[]>([]);
  const [subcategories, setSubcategories] = useState<CustomerSubcategory[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [excludedCompanyIds, setExcludedCompanyIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<MessagingPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [addHint, setAddHint] = useState("");

  const selectedCategory = categories.find((item) => item.id === categoryId);
  const selectedSubcategory = subcategories.find((item) => item.id === subcategoryId);
  const subcategoryIds = useMemo(() => basket.map((item) => item.subcategoryId), [basket]);
  const subcategoryKey = subcategoryIds.join(",");
  const excludedKey = excludedCompanyIds.join(",");
  const progress = smsProgress(body);
  const { parts } = smsEncodingAndParts(body);
  const validCount = preview?.validRecipientCount ?? 0;
  const estimatedUnits = validCount * parts;
  const canSend = basket.length > 0 && validCount > 0 && body.trim().length > 0 && !sending;

  useEffect(() => {
    let cancelled = false;
    referenceService
      .getCustomerCategories()
      .then((items) => {
        if (!cancelled) setCategories(items.filter((item) => item.isActive));
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    let cancelled = false;
    referenceService
      .getCustomerSubcategories(categoryId)
      .then((items) => {
        if (!cancelled) setSubcategories(items.filter((item) => item.isActive));
      })
      .catch(() => {
        if (!cancelled) setSubcategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const loadPreview = useCallback(async () => {
    if (!subcategoryKey) {
      setPreview(null);
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    setError("");
    try {
      const ids = subcategoryKey.split(",");
      const excluded = excludedKey ? excludedKey.split(",") : [];
      const result = await messagingService.preview({
        subcategoryIds: ids,
        excludedCompanyIds: excluded.length ? excluded : undefined,
        page,
        limit: PAGE_SIZE,
      });
      setPreview(result);
      setBasket((current) => {
        let changed = false;
        const next = current.map((item) => {
          const segment = result.segments.find((row) => row.subcategoryId === item.subcategoryId);
          if (!segment || segment.companyCount === item.companyCount) return item;
          changed = true;
          return { ...item, companyCount: segment.companyCount };
        });
        return changed ? next : current;
      });
      if (result.meta.page > result.meta.totalPages) {
        setPage(result.meta.totalPages);
      }
    } catch (err) {
      setPreview(null);
      setError(errorMessage(err, "Alıcı listesi yüklenemedi"));
    } finally {
      setPreviewLoading(false);
    }
  }, [excludedKey, page, subcategoryKey]);

  useEffect(() => {
    if (!subcategoryKey) {
      setPreview(null);
      return;
    }
    const handle = window.setTimeout(() => {
      void loadPreview();
    }, 300);
    return () => window.clearTimeout(handle);
  }, [loadPreview, subcategoryKey]);

  const addToBasket = () => {
    setAddHint("");
    if (!selectedCategory || !selectedSubcategory) {
      setAddHint("Ana kategori ve alt kategori seçin");
      return;
    }
    if (basket.some((item) => item.subcategoryId === selectedSubcategory.id)) {
      setAddHint("Bu müşteri türü zaten sepette");
      return;
    }
    setBasket((current) => [
      ...current,
      {
        subcategoryId: selectedSubcategory.id,
        name: selectedSubcategory.name,
        categoryName: selectedCategory.name,
        companyCount: 0,
      },
    ]);
    setSubcategoryId("");
    setPage(1);
    setSuccess("");
  };

  const removeFromBasket = (id: string) => {
    setBasket((current) => current.filter((item) => item.subcategoryId !== id));
    setPage(1);
    setSuccess("");
  };

  const clearBasket = () => {
    setBasket([]);
    setExcludedCompanyIds([]);
    setPreview(null);
    setPage(1);
    setSuccess("");
  };

  const excludeCompany = (companyId: string) => {
    setExcludedCompanyIds((current) =>
      current.includes(companyId) ? current : [...current, companyId],
    );
    setSuccess("");
  };

  const sendCampaign = async () => {
    if (!canSend) return;
    setSending(true);
    setError("");
    setSuccess("");
    try {
      const result = await messagingService.createCampaign({
        subcategoryIds: basket.map((item) => item.subcategoryId),
        excludedCompanyIds: excludedCompanyIds.length ? excludedCompanyIds : undefined,
        body: body.trim(),
      });
      setConfirmOpen(false);
      setSuccess(result.message);
    } catch (err) {
      setConfirmOpen(false);
      setError(errorMessage(err, "Gönderim kaydı oluşturulamadı"));
    } finally {
      setSending(false);
    }
  };

  const pageNumbers = useMemo(() => {
    const totalPages = preview?.meta.totalPages ?? 1;
    const current = preview?.meta.page ?? page;
    const windowSize = 5;
    const start = Math.max(1, current - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [page, preview]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Gönderimi onayla</h2>
            <p className="mt-2 text-sm text-slate-600">
              Gerçek SMS gönderilmeyecek. {validCount} geçerli alıcı, {parts} SMS parçası, tahmini{" "}
              {estimatedUnits} SMS kaydı oluşturulacak.
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={sending}
                onClick={() => setConfirmOpen(false)}
              >
                İptal
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={sending}
                onClick={() => void sendCampaign()}
              >
                {sending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Kaydı Oluştur
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 text-sm text-slate-500">
            <Link href="/admin/companies" className="hover:text-slate-700">
              Firma Listesi
            </Link>
            <span className="mx-2">/</span>
            <span>Müşterilere Mesaj At</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Müşterilere Mesaj At</h1>
          <p className="mt-1 text-sm text-slate-500">
            Müşteri türlerini seçerek kayıtlı firmaların cep telefonu numaralarına toplu SMS hazırlayın.
          </p>
        </div>
        <Link href="/admin/companies">
          <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Firma Listesine Dön
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                1
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Müşteri Türleri Seçimi</h2>
                <p className="text-xs text-slate-500">
                  Ana kategori ve alt kategori seçerek müşteri türlerini sepetinize ekleyin.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="bulkCategory">Ana Kategori</Label>
                <select
                  id="bulkCategory"
                  value={categoryId}
                  onChange={(event) => {
                    setCategoryId(event.target.value);
                    setSubcategoryId("");
                    setAddHint("");
                  }}
                  className={selectClass}
                >
                  <option value="">Seçiniz</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulkSubcategory">Alt Kategori</Label>
                <select
                  id="bulkSubcategory"
                  value={subcategoryId}
                  onChange={(event) => {
                    setSubcategoryId(event.target.value);
                    setAddHint("");
                  }}
                  disabled={!categoryId}
                  className={selectClass}
                >
                  <option value="">{categoryId ? "Seçiniz" : "Önce ana kategori seçiniz"}</option>
                  {subcategories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={addToBasket}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Sepete Ekle
              </Button>
            </div>
            {addHint && <p className="mt-2 text-xs text-amber-700">{addHint}</p>}

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-800">
                  Seçilen Müşteri Türleri ({basket.length})
                </p>
                {basket.length > 0 && (
                  <button
                    type="button"
                    onClick={clearBasket}
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Tümünü Temizle
                  </button>
                )}
              </div>
              {basket.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  Henüz müşteri türü eklenmedi.
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {basket.map((item) => (
                    <div
                      key={item.subcategoryId}
                      className="flex min-w-[180px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <Tags className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.categoryName} · {item.companyCount} firma
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromBasket(item.subcategoryId)}
                        className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                        aria-label={`${item.name} türünü çıkar`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                2
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Alıcı Özeti</h2>
                <p className="text-xs text-slate-500">
                  Seçilen müşteri türlerine göre bulunan firmalar ve geçerli telefon numaraları.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <SummaryStat
                icon={<Tags className="h-4 w-4" />}
                label="Seçilen Tür"
                value={preview?.selectedTypeCount ?? basket.length}
              />
              <SummaryStat
                icon={<Building2 className="h-4 w-4" />}
                label="Bulunan Firma"
                value={preview?.companyCount ?? 0}
              />
              <SummaryStat
                icon={<Phone className="h-4 w-4" />}
                label="Geçerli Cep"
                value={preview?.validRecipientCount ?? 0}
                accent="text-blue-700"
              />
              <SummaryStat
                icon={<AlertTriangle className="h-4 w-4" />}
                label="Eksik / Geçersiz"
                value={(preview?.invalidRecipientCount ?? 0) + (preview?.duplicateCount ?? 0)}
                accent="text-amber-700"
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  3
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Alıcı Listesi (Önizleme)</h2>
                  <p className="text-xs text-slate-500">
                    Mesaj gönderilecek firmaları görüntüleyin. İsterseniz listeden firma çıkarabilirsiniz.
                  </p>
                </div>
              </div>
              {previewLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
            </div>

            {basket.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                Önizleme için sepete en az bir müşteri türü ekleyin.
              </p>
            ) : previewLoading && !preview ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              </div>
            ) : !preview || preview.recipients.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                Bu seçime uygun geçerli alıcı bulunamadı.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Firma Adı</TableHead>
                        <TableHead>Müşteri Türü</TableHead>
                        <TableHead>Cep Telefonu</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">İşlem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.recipients.map((row) => (
                        <TableRow key={row.companyId}>
                          <TableCell className="font-medium text-slate-800">{row.companyName}</TableCell>
                          <TableCell>{row.subcategoryName}</TableCell>
                          <TableCell className="tabular-nums">{row.mobile || "-"}</TableCell>
                          <TableCell>
                            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              Geçerli
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              type="button"
                              onClick={() => excludeCompany(row.companyId)}
                              className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-50"
                              aria-label={`${row.companyName} firmasını çıkar`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    Toplam {preview.meta.total} geçerli alıcıdan {preview.recipients.length} tanesi gösteriliyor.
                  </p>
                  {preview.meta.totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                      >
                        ‹
                      </Button>
                      {pageNumbers.map((number) => (
                        <Button
                          key={number}
                          variant={number === page ? "default" : "outline"}
                          size="sm"
                          className={number === page ? "bg-blue-600 text-white hover:bg-blue-700" : ""}
                          onClick={() => setPage(number)}
                        >
                          {number}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= preview.meta.totalPages}
                        onClick={() => setPage((current) => current + 1)}
                      >
                        ›
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-900">Mesaj İçeriği</h2>
            </div>
            <Textarea
              value={body}
              maxLength={MAX_BODY}
              onChange={(event) => {
                setBody(event.target.value);
                setSuccess("");
              }}
              placeholder="Mesajınızı buraya yazın..."
              className="min-h-40"
            />
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                {body.length} / {MAX_BODY} karakter
                {progress.encoding === "UCS2" ? " · Unicode" : " · GSM-7"}
              </span>
              <span>
                {parts} SMS ({progress.used}/{progress.perPart})
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">Gönderim Özeti</h2>
            </div>
            <dl className="space-y-2 text-sm">
              <SummaryRow label="Seçilen Müşteri Türü" value={preview?.selectedTypeCount ?? basket.length} />
              <SummaryRow label="Toplam Firma" value={preview?.companyCount ?? 0} />
              <SummaryRow label="Geçerli Alıcı" value={validCount} />
              <SummaryRow label="SMS Parça Sayısı" value={parts} />
              <SummaryRow label="Tahmini Toplam SMS" value={estimatedUnits} />
            </dl>
            <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
              1 SMS = GSM-7 için 160, Unicode için 70 karakter. Daha uzun mesajlar birden fazla SMS olarak sayılır.
            </p>
            <Button
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!canSend}
              onClick={() => setConfirmOpen(true)}
            >
              <Send className="mr-2 h-4 w-4" />
              SMS Gönder
            </Button>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            <p className="mb-2 font-semibold">Önemli Hatırlatma</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Yalnızca aktif müşteri firmaların kayıtlı cep numarası kullanılır.</li>
              <li>Aynı numaraya bir kez gönderim yapılır.</li>
              <li>Bu ekran gerçek SMS göndermez; kayıt oluşturulur.</li>
              <li>Admin yalnızca direkt müşterilerine, bayi kendi müşterilerine yazar.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SummaryStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="mb-2 text-slate-400">{icon}</div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${accent ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
