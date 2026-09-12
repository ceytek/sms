"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/modules/auth";
import { referenceService, Product } from "@/modules/companies";
import { adsService, AdPreviewModal, PriceListAd } from "@/modules/ads";
import {
  pricingService,
  PriceList,
  PriceListType,
  PriceListAssignment,
  PRICE_LIST_TYPE_LABELS,
} from "@/modules/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Save,
  Plus,
  Loader2,
  Pencil,
  X,
  Users,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Eye,
  Megaphone,
} from "lucide-react";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function PricingPage() {
  const router = useRouter();
  const user = authService.getUser();
  const isDealer = user?.role === "DEALER";

  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [assignmentsModal, setAssignmentsModal] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<PriceListAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [adPreview, setAdPreview] = useState<PriceListAd | null>(null);
  const [creatingAdId, setCreatingAdId] = useState<string | null>(null);
  const [adError, setAdError] = useState("");

  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<PriceListType>("CUSTOMER");
  const [isCreating, setIsCreating] = useState(false);

  const [activeTab, setActiveTab] = useState<PriceListType>(
    isDealer ? "CUSTOMER" : "DEALER"
  );

  useEffect(() => {
    if (!user || (user.role !== "ADMIN" && user.role !== "DEALER")) {
      router.push("/");
    }
  }, [router, user]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [lists, prods] = await Promise.allSettled([
        pricingService.listPriceLists(),
        referenceService.getProducts(),
      ]);
      if (lists.status === "fulfilled") setPriceLists(lists.value);
      if (prods.status === "fulfilled") setProducts(prods.value);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [viewMode, setViewMode] = useState<"edit" | "view">("edit");

  const loadListItems = async (listId: string) => {
    try {
      const items = await pricingService.getListItems(listId);
      const prices: Record<string, number> = {};
      items.forEach((item: any) => {
        prices[item.productId] = item.unitPrice;
      });
      products.forEach((p) => {
        if (!(p.id in prices)) prices[p.id] = 0;
      });
      setEditedPrices(prices);
    } catch {
      const prices: Record<string, number> = {};
      products.forEach((p) => { prices[p.id] = 0; });
      setEditedPrices(prices);
    }
  };

  const toggleExpand = async (listId: string, mode: "edit" | "view" = "edit") => {
    if (expandedId === listId && viewMode === mode) {
      setExpandedId(null);
      return;
    }
    setExpandedId(listId);
    setViewMode(mode);
    setMessage("");
    await loadListItems(listId);
  };

  const handlePriceChange = (productId: string, value: string) => {
    setEditedPrices((prev) => ({ ...prev, [productId]: Number(value) }));
  };

  const persistPrices = async (listId: string) => {
    const items = Object.entries(editedPrices)
      .filter(([, price]) => Number(price) > 0)
      .map(([productId, unitPrice]) => ({ productId, unitPrice: Number(unitPrice) }));
    if (!items.length) return;
    await pricingService.updatePriceListItems(listId, items);
  };

  const handleCreateAd = async (listId: string) => {
    setAdError("");
    setCreatingAdId(listId);
    try {
      if (expandedId === listId) {
        await persistPrices(listId);
      }
      const ad = await adsService.createPriceListAd(listId);
      setAdPreview(ad);
      await loadData();
    } catch (err) {
      setAdError(err instanceof Error ? err.message : "Reklam oluşturulamadı");
    } finally {
      setCreatingAdId(null);
    }
  };

  const handleSave = async (listId: string) => {
    setIsSaving(true);
    setMessage("");
    try {
      await persistPrices(listId);
      setMessage("Fiyatlar başarıyla kaydedildi.");
      await loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Kaydetme başarısız");
    } finally {
      setIsSaving(false);
    }
  };

  const openAssignments = async (listId: string) => {
    setAssignmentsModal(listId);
    setLoadingAssignments(true);
    try {
      const data = await pricingService.getListAssignments(listId);
      setAssignments(data);
    } catch {
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      await pricingService.createPriceList({
        name: newName.trim(),
        listType: newType,
        currency: "TRY",
        isActive: true,
      });
      setShowNewForm(false);
      setNewName("");
      await loadData();
    } catch {
      // silently fail
    } finally {
      setIsCreating(false);
    }
  };

  const filteredLists = priceLists.filter((l) =>
    isDealer ? l.listType === "CUSTOMER" : l.listType === activeTab
  );

  const tabs: { type: PriceListType; label: string }[] = isDealer
    ? []
    : [
        { type: "DEALER", label: "Bayi Fiyatları" },
        { type: "CUSTOMER", label: "Müşteri Fiyatları" },
        { type: "PLATFORM", label: "Platform Fiyatları" },
      ];

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const assignmentList = priceLists.find(
    (l) => l.id === assignmentsModal
  );

  const sortedProducts = [...products].sort((a, b) => {
    if (a.productType !== b.productType) {
      return a.productType === "SMS" ? -1 : 1;
    }
    return a.creditAmount - b.creditAmount;
  });

  const smsProducts = sortedProducts.filter((p) => p.productType === "SMS");

  const baremFor = (product: Product) => {
    if (product.productType !== "SMS" || !product.creditAmount) return "—";
    const index = smsProducts.findIndex((p) => p.id === product.id);
    if (index < 0) return "—";
    const from = index === 0 ? 1 : smsProducts[index - 1].creditAmount + 1;
    const to = product.creditAmount;
    return `${from.toLocaleString("tr-TR")} – ${to.toLocaleString("tr-TR")} SMS`;
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Fiyat Listesi Yönetimi
            </h1>
            <p className="text-sm text-slate-500">
              Fiyat şablonlarını yönetin ve firmalara atayın
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setShowNewForm(true);
            setExpandedId(null);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Yeni Şablon
        </Button>
      </div>

      {adError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {adError}
        </div>
      )}

      {/* New Template Form Modal */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowNewForm(false)}
          />
          <div className="relative z-50 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Yeni Fiyat Şablonu
              </h2>
              <button
                onClick={() => setShowNewForm(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-gray-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Şablon Adı</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Örn: Premium Müşteri Fiyatları"
                />
              </div>
              <div className="space-y-2">
                <Label>Tip</Label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as PriceListType)}
                  className={selectClass}
                >
                  {isDealer ? (
                    <option value="CUSTOMER">Müşteri</option>
                  ) : (
                    <>
                      <option value="DEALER">Bayi</option>
                      <option value="CUSTOMER">Müşteri</option>
                      <option value="PLATFORM">Platform</option>
                    </>
                  )}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowNewForm(false)}
                >
                  İptal
                </Button>
                <Button
                  onClick={handleCreateTemplate}
                  disabled={isCreating || !newName.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isCreating && (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  )}
                  Oluştur
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs (admin only) */}
      {!isDealer && (
        <div className="flex gap-1 mb-4 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.type}
              onClick={() => {
                setActiveTab(tab.type);
                setExpandedId(null);
              }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.type
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {isDealer && (
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Müşteri Fiyatlarım
        </h2>
      )}

      {/* Price Lists Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {filteredLists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <CreditCard className="h-10 w-10 mb-3 text-slate-300" />
            <p className="text-sm">Bu kategoride fiyat şablonu bulunmuyor.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setShowNewForm(true)}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              İlk şablonu oluştur
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-10" />
                <TableHead>Şablon Adı</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead>Para Birimi</TableHead>
                <TableHead className="text-center">Ürün Sayısı</TableHead>
                <TableHead className="text-center">Atanan Firma</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLists.map((list) => {
                const isExpanded = expandedId === list.id;
                return (
                  <TableRow key={list.id} className="group">
                    <TableCell>
                      <button
                        onClick={() => toggleExpand(list.id)}
                        className="rounded p-1 hover:bg-slate-100"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">
                      {list.name}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          list.listType === "DEALER"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : list.listType === "CUSTOMER"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                        }
                      >
                        {PRICE_LIST_TYPE_LABELS[list.listType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {list.currency}
                    </TableCell>
                    <TableCell className="text-center text-slate-600">
                      {(list.items ?? []).length}
                    </TableCell>
                    <TableCell className="text-center">
                      <button
                        onClick={() => openAssignments(list.id)}
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:bg-blue-50"
                        title="Atanan firmaları görüntüle"
                      >
                        <Users className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-blue-700">
                          {list.assignmentCount ?? 0}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={list.isActive ? "default" : "secondary"}
                        className={
                          list.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }
                      >
                        {list.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateAd(list.id)}
                          disabled={creatingAdId === list.id}
                          title="Instagram reklam görseli oluştur"
                        >
                          {creatingAdId === list.id ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Megaphone className="mr-1 h-3.5 w-3.5" />
                          )}
                          Reklam
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpand(list.id, "view")}
                          title="Fiyatları görüntüle"
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          Görüntüle
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpand(list.id, "edit")}
                        >
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Düzenle
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Expanded Price View/Editor */}
      {expandedId && (
        <div className={`mt-4 rounded-xl border ${viewMode === "view" ? "border-slate-200" : "border-blue-200"} bg-white shadow-sm overflow-hidden`}>
          <div className={`flex items-center justify-between border-b px-4 py-3 ${viewMode === "view" ? "border-slate-100 bg-slate-50" : "border-blue-100 bg-blue-50"}`}>
            <div className="flex items-center gap-2">
              {viewMode === "view" ? (
                <Eye className="h-4 w-4 text-slate-600" />
              ) : (
                <Pencil className="h-4 w-4 text-blue-600" />
              )}
              <span className={`font-medium ${viewMode === "view" ? "text-slate-900" : "text-blue-900"}`}>
                {priceLists.find((l) => l.id === expandedId)?.name} — {viewMode === "view" ? "Fiyat Görüntüleme" : "Fiyat Düzenleme"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {message && (
                <span className="text-sm text-emerald-700">{message}</span>
              )}
              {viewMode === "view" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setViewMode("edit"); }}
                >
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Düzenlemeye Geç
                </Button>
              ) : (
                <Button
                  onClick={() => handleSave(expandedId)}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {isSaving ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-4 w-4" />
                  )}
                  Kaydet
                </Button>
              )}
              <button
                onClick={() => setExpandedId(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-gray-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barem</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead className="text-right w-40">
                  Birim Fiyat (TRY)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium text-slate-900">
                    {baremFor(product)}
                  </TableCell>
                  <TableCell>
                    <div className="text-slate-900">{product.name}</div>
                    <div className="font-mono text-xs text-slate-400">{product.code}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {product.productType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {viewMode === "view" ? (
                      <span className="font-mono text-slate-700">
                        {Number(editedPrices[product.id] ?? 0).toLocaleString("tr-TR", {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4,
                        })}
                      </span>
                    ) : (
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        className="ml-auto w-32 text-right"
                        value={editedPrices[product.id] ?? 0}
                        onChange={(e) =>
                          handlePriceChange(product.id, e.target.value)
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-slate-500"
                  >
                    Henüz ürün tanımlanmamış.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Assignments Modal */}
      {assignmentsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setAssignmentsModal(null)}
          />
          <div className="relative z-50 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Atanan Firmalar
                </h2>
                <p className="text-sm text-slate-500">
                  {assignmentList?.name} şablonuna atanan firmalar
                </p>
              </div>
              <button
                onClick={() => setAssignmentsModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-gray-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingAssignments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : assignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <Users className="h-8 w-8 mb-2 text-slate-300" />
                <p className="text-sm">
                  Bu şablona henüz firma atanmamış.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Firma Kodu</TableHead>
                      <TableHead>Firma Adı</TableHead>
                      <TableHead>Atanma Tarihi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-sm text-blue-600">
                          {a.companyCode}
                        </TableCell>
                        <TableCell className="text-slate-900">
                          {a.companyName}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {new Date(a.assignedAt).toLocaleDateString("tr-TR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => setAssignmentsModal(null)}
              >
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}

      {adPreview && (
        <AdPreviewModal ad={adPreview} onClose={() => setAdPreview(null)} />
      )}
    </div>
  );
}
