"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/modules/auth";
import {
  providerService,
  type SmsProviderDetail,
  type ProviderCompany,
} from "@/modules/providers/services/provider.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Power, Loader2, X, Radio, Users } from "lucide-react";

export default function ProvidersPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<SmsProviderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<SmsProviderDetail | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [companiesModal, setCompaniesModal] = useState<string | null>(null);
  const [companies, setCompanies] = useState<ProviderCompany[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  useEffect(() => {
    const user = authService.getUser();
    if (!user || user.role !== "ADMIN") {
      router.push("/admin");
      return;
    }
  }, [router]);

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await providerService.list();
      setProviders(data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const openCreateDialog = () => {
    setEditingProvider(null);
    setFormCode("");
    setFormName("");
    setFormActive(true);
    setDialogOpen(true);
  };

  const openEditDialog = (provider: SmsProviderDetail) => {
    setEditingProvider(provider);
    setFormCode(provider.code);
    setFormName(provider.name);
    setFormActive(provider.isActive);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingProvider) {
        await providerService.update(editingProvider.id, {
          code: formCode,
          name: formName,
          isActive: formActive,
        });
      } else {
        await providerService.create({
          code: formCode,
          name: formName,
          isActive: formActive,
        });
      }
      setDialogOpen(false);
      await fetchProviders();
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (provider: SmsProviderDetail) => {
    setTogglingId(provider.id);
    try {
      await providerService.update(provider.id, { isActive: !provider.isActive });
      await fetchProviders();
    } catch {
      // handle error
    } finally {
      setTogglingId(null);
    }
  };

  const openCompaniesModal = async (providerId: string) => {
    setCompaniesModal(providerId);
    setLoadingCompanies(true);
    try {
      const data = await providerService.getProviderCompanies(providerId);
      setCompanies(data);
    } catch {
      setCompanies([]);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const modalProvider = providers.find((p) => p.id === companiesModal);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <Radio className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">SMS Sağlayıcılar</h1>
            <p className="text-sm text-slate-500">SMS sağlayıcılarını yönetin</p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="mr-1.5 h-4 w-4" />
          Yeni Sağlayıcı
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Radio className="h-10 w-10 mb-3 text-slate-300" />
            <p className="text-sm">Henüz sağlayıcı eklenmemiş</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={openCreateDialog}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              İlk sağlayıcıyı ekle
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Kod</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead className="text-center">Kullanan Firma</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="text-right">İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell className="font-mono text-sm font-medium">
                    {provider.code}
                  </TableCell>
                  <TableCell>{provider.name}</TableCell>
                  <TableCell className="text-center">
                    <button
                      onClick={() => openCompaniesModal(provider.id)}
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:bg-blue-50"
                      title="Kullanan firmaları görüntüle"
                    >
                      <Users className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-blue-700">
                        {provider.companyCount ?? 0}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={provider.isActive ? "default" : "secondary"}
                      className={
                        provider.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }
                    >
                      {provider.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(provider)}
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Düzenle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStatus(provider)}
                        disabled={togglingId === provider.id}
                      >
                        {togglingId === provider.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Power className="mr-1 h-3.5 w-3.5" />
                        )}
                        {provider.isActive ? "Pasifleştir" : "Aktifleştir"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setDialogOpen(false)}
          />
          <div className="relative z-50 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingProvider ? "Sağlayıcı Düzenle" : "Yeni Sağlayıcı"}
              </h2>
              <button
                onClick={() => setDialogOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-gray-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="providerCode">Kod</Label>
                <Input
                  id="providerCode"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="Örn: NETGSM"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="providerName">Ad</Label>
                <Input
                  id="providerName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Örn: NetGSM"
                  required
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                <Label htmlFor="providerActive" className="cursor-pointer">
                  Aktif
                </Label>
                <Switch
                  id="providerActive"
                  checked={formActive}
                  onCheckedChange={(val) => setFormActive(val as boolean)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  {editingProvider ? "Güncelle" : "Oluştur"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Companies Using Provider Modal */}
      {companiesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setCompaniesModal(null)}
          />
          <div className="relative z-50 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Kullanan Firmalar
                </h2>
                <p className="text-sm text-slate-500">
                  {modalProvider?.name} sağlayıcısını kullanan firmalar
                </p>
              </div>
              <button
                onClick={() => setCompaniesModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-gray-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingCompanies ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : companies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <Users className="h-8 w-8 mb-2 text-slate-300" />
                <p className="text-sm">Bu sağlayıcıyı kullanan firma bulunmuyor.</p>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Firma Kodu</TableHead>
                      <TableHead>Firma Adı</TableHead>
                      <TableHead>Kullanıcı Adı</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-sm text-blue-600">
                          {c.companyCode}
                        </TableCell>
                        <TableCell className="text-slate-900">
                          {c.companyName}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {c.username || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={() => setCompaniesModal(null)}>
                Kapat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
