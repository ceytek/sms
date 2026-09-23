"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Building2,
  Loader2,
  X,
  UserPlus,
  Eye,
  EyeOff,
  MessageSquare,
  Sparkles,
  FileCheck,
  FileX,
  Phone,
  Mail,
  CreditCard,
  Users,
  Settings,
  Globe,
  Send,
  Plus,
  Trash2,
  Radio,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import {
  CompanyDetail,
  COMPANY_TYPE_LABELS,
  COMPANY_STATUS_LABELS,
  CONTACT_TYPE_LABELS,
  CUSTOMER_TYPE_LABELS,
  NOTIFICATION_TYPE_LABELS,
  ORIGINATOR_STATUS_LABELS,
  type ContactType,
} from "../types";
import { ClassificationFields } from "./classification-fields";
import { Switch } from "@/components/ui/switch";
import { companyService } from "../services/company.service";
import { referenceService, type City, type District, type Service, type SmsProvider } from "../services/reference.service";
import { PRICE_LIST_TYPE_LABELS, pricingService, type PriceList, type PriceListItem } from "@/modules/pricing";
import { CreditRefundFields } from "./credit-refund-fields";
import {
  displayCreditRefundRate,
  formatCreditRefundRate,
  parseCreditRefundRate,
} from "../utils/credit-refund";

interface CompanyUser {
  id: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface CompanyDetailViewProps {
  company: CompanyDetail;
}

const TABS = [
  { id: "overview", label: "Genel Bakış", icon: Building2 },
  { id: "contact", label: "İletişim", icon: Phone },
  { id: "sms", label: "Başlıklar", icon: Send },
  { id: "services", label: "Hizmetler", icon: Settings },
  { id: "users", label: "Kullanıcılar", icon: Users },
  { id: "pricing", label: "Fiyatlandırma", icon: CreditCard },
] as const;

type TabId = (typeof TABS)[number]["id"];

function StatusDot({ active }: { active: boolean }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`} />
  );
}

export function CompanyDetailView({ company: initialCompany }: CompanyDetailViewProps) {
  const [company, setCompany] = useState(initialCompany);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await apiRequest<CompanyUser[]>(`admin/companies/${company.id}/users`);
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [company.id]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/admin/companies">
              <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-slate-300 hover:text-slate-600">
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-200">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl truncate">{company.name}</h1>
                <Badge variant="outline" className={company.isDealer ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-purple-50 text-purple-700 border-purple-200"}>
                  {company.isDealer ? "Bayi" : "Müşteri"}
                </Badge>
                <Badge variant="outline" className={
                  company.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  company.status === "SUSPENDED" ? "bg-amber-50 text-amber-700 border-amber-200" :
                  "bg-slate-50 text-slate-500 border-slate-200"
                }>
                  {COMPANY_STATUS_LABELS[company.status]}
                </Badge>
              </div>
              <p className="mt-0.5 font-mono text-sm text-slate-400">{company.companyCode}</p>
            </div>
          </div>
          {company.dealerCompanyName && (
            <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm text-blue-700">
              <span className="font-medium">Bağlı Bayi:</span> {company.dealerCompanyName}
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          icon={<MessageSquare className="h-5 w-5" />}
          iconBg="bg-blue-100 text-blue-600"
          label="SMS Bakiye"
          value={Number(company.smsBalance ?? 0).toLocaleString("tr-TR")}
        />
        <SummaryCard
          icon={<Sparkles className="h-5 w-5" />}
          iconBg="bg-violet-100 text-violet-600"
          label="AI Bakiye"
          value={Number(company.aiBalance ?? 0).toLocaleString("tr-TR")}
        />
        <SummaryCard
          icon={<CreditCard className="h-5 w-5" />}
          iconBg={company.priceListName ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}
          label="Fiyat Şablonu"
          value={company.priceListName ?? "Atanmamış"}
          muted={!company.priceListName}
        />
        <Link href={`/admin/companies/${company.id}/documents`} className="block">
          <SummaryCard
            icon={
              company.documentProcessStatus === "completed" || company.documentsCompleted
                ? <FileCheck className="h-5 w-5" />
                : <FileX className="h-5 w-5" />
            }
            iconBg={
              company.documentProcessStatus === "completed" || company.documentsCompleted
                ? "bg-emerald-100 text-emerald-600"
                : "bg-amber-100 text-amber-600"
            }
            label="Evrak Durumu"
            value={
              company.documentProcessStatus === "completed" || company.documentsCompleted
                ? "Tamamlandı"
                : "Devam Ediyor"
            }
            subValue={`${company.documentAvailableCount ?? 0} / ${company.documentTotalCount ?? 0} belge mevcut`}
            muted={company.documentProcessStatus !== "completed" && !company.documentsCompleted}
          />
        </Link>
      </div>

      {/* Tab Navigation + Content */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Tab Nav — horizontal scroll on mobile, vertical sidebar on desktop */}
        <nav className="flex lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0 lg:w-52 lg:shrink-0 scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {activeTab === "overview" && (
            <OverviewTab company={company} onUpdated={setCompany} />
          )}
          {activeTab === "contact" && (
            <ContactTab company={company} onUpdated={setCompany} />
          )}
          {activeTab === "sms" && <SmsTab company={company} />}
          {activeTab === "services" && (
            <ServicesTab company={company} onUpdated={setCompany} />
          )}
          {activeTab === "users" && (
            <UsersTab
              companyId={company.id}
              companyCode={company.companyCode}
              users={users}
              loading={loadingUsers}
              onReload={loadUsers}
            />
          )}
          {activeTab === "pricing" && (
            <PricingTab company={company} onUpdated={setCompany} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────── Summary Card ──────────────────────────── */

function SummaryCard({ icon, iconBg, label, value, muted, subValue }: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  muted?: boolean;
  subValue?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-400">{label}</p>
          <p className={`text-base font-bold truncate ${muted ? "text-slate-400" : "text-slate-900"}`}>{value}</p>
          {subValue && <p className="text-xs text-slate-500">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────── Section Card ──────────────────────────── */

function Section({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          {title && <h3 className="text-sm font-semibold text-slate-700">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 mb-3">
        <Settings className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

/* ──────────────────────────── Info Row ──────────────────────────── */

function InfoRow({ label, value }: { label: string; value?: string | number | boolean }) {
  if (value === undefined || value === "" || value === null) return null;
  const display = typeof value === "boolean" ? (value ? "Evet" : "Hayır") : value;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-0 py-2.5 border-b border-slate-50 last:border-0">
      <dt className="text-xs text-slate-400 sm:w-40 shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-slate-800">{display}</dd>
    </div>
  );
}

/* ──────────────────────────── Overview Tab ──────────────────────────── */

function OverviewTab({
  company,
  onUpdated,
}: {
  company: CompanyDetail;
  onUpdated: (company: CompanyDetail) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerType: company.customerType ?? ("" as const),
    categoryId: company.categoryId ?? "",
    subcategoryId: company.subcategoryId ?? "",
  });

  useEffect(() => {
    setForm({
      customerType: company.customerType ?? "",
      categoryId: company.categoryId ?? "",
      subcategoryId: company.subcategoryId ?? "",
    });
  }, [company.id, company.customerType, company.categoryId, company.subcategoryId]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = await companyService.update(company.id, {
        customerType: form.customerType || null,
        categoryId: form.categoryId || null,
        subcategoryId: form.subcategoryId || null,
      });
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt güncellenemedi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Section
        title="Firma Bilgileri"
        action={
          editing ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                Vazgeç
              </Button>
              <Button size="sm" onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Düzenle
            </Button>
          )
        }
      >
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <dl>
          <InfoRow label="Hesap Türü" value={company.isDealer ? "Bayi" : "Müşteri"} />
          <InfoRow label="Firma Tipi" value={COMPANY_TYPE_LABELS[company.companyType]} />
          {!editing && (
            <>
              <InfoRow
                label="Müşteri Tipi"
                value={company.customerType ? CUSTOMER_TYPE_LABELS[company.customerType] : "—"}
              />
              <InfoRow label="Ana Kategori" value={company.categoryName || "—"} />
              <InfoRow label="Alt Kategori" value={company.subcategoryName || "—"} />
            </>
          )}
        </dl>
        {editing && (
          <div className="my-3 border-y border-slate-100 py-4">
            <ClassificationFields
              value={form}
              onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
              currentCategory={
                company.categoryId && company.categoryName
                  ? { id: company.categoryId, name: company.categoryName }
                  : null
              }
              currentSubcategory={
                company.subcategoryId && company.subcategoryName
                  ? { id: company.subcategoryId, name: company.subcategoryName }
                  : null
              }
            />
          </div>
        )}
        <dl>
          <InfoRow label="Vergi Dairesi" value={company.taxOffice} />
          <InfoRow label="Vergi No" value={company.taxNumber} />
          <InfoRow label="TC Kimlik No" value={company.nationalId} />
          <InfoRow label="Seri No" value={company.serialNumber} />
          <InfoRow label="Doğum Tarihi" value={company.birthDate} />
          <InfoRow label="Alt Hesap" value={company.isSubAccount} />
          <InfoRow label="Ana Firma" value={company.parentCompanyName} />
          <InfoRow label="Bağlı Bayi" value={company.dealerCompanyName} />
        </dl>
      </Section>
    </div>
  );
}

/* ──────────────────────────── Contact Tab ──────────────────────────── */

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function ContactTab({
  company,
  onUpdated,
}: {
  company: CompanyDetail;
  onUpdated: (company: CompanyDetail) => void;
}) {
  const [editingAddress, setEditingAddress] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [addressForm, setAddressForm] = useState({
    cityId: company.cityId ? String(company.cityId) : "",
    districtId: company.districtId ? String(company.districtId) : "",
    address: company.address ?? "",
    phone: company.phone ?? "",
    mobile: company.mobile ?? "",
    email: company.email ?? "",
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState("");

  const [addingContact, setAddingContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    contactType: "MANAGER" as ContactType,
    phone: "",
    mobile: "",
    email: "",
  });
  const [savingContact, setSavingContact] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [contactError, setContactError] = useState("");

  useEffect(() => {
    setAddressForm({
      cityId: company.cityId ? String(company.cityId) : "",
      districtId: company.districtId ? String(company.districtId) : "",
      address: company.address ?? "",
      phone: company.phone ?? "",
      mobile: company.mobile ?? "",
      email: company.email ?? "",
    });
  }, [company.id, company.cityId, company.districtId, company.address, company.phone, company.mobile, company.email]);

  useEffect(() => {
    referenceService
      .getCities()
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    if (!addressForm.cityId) {
      setDistricts([]);
      return;
    }
    referenceService
      .getDistricts(Number(addressForm.cityId))
      .then(setDistricts)
      .catch(() => setDistricts([]));
  }, [addressForm.cityId]);

  const saveAddress = async () => {
    setSavingAddress(true);
    setAddressError("");
    try {
      const updated = await companyService.update(company.id, {
        cityId: addressForm.cityId ? Number(addressForm.cityId) : null,
        districtId: addressForm.districtId ? Number(addressForm.districtId) : null,
        address: addressForm.address.trim(),
        phone: addressForm.phone.trim(),
        mobile: addressForm.mobile.trim(),
        email: addressForm.email.trim(),
      });
      onUpdated(updated);
      setEditingAddress(false);
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : "Adres güncellenemedi");
    } finally {
      setSavingAddress(false);
    }
  };

  const addContact = async () => {
    if (!contactForm.name.trim()) {
      setContactError("Ad soyad girin");
      return;
    }
    setSavingContact(true);
    setContactError("");
    try {
      const updated = await companyService.addContact(company.id, {
        name: contactForm.name.trim(),
        contactType: contactForm.contactType,
        phone: contactForm.phone.trim() || undefined,
        mobile: contactForm.mobile.trim() || undefined,
        email: contactForm.email.trim() || undefined,
      });
      onUpdated(updated);
      setContactForm({ name: "", contactType: "MANAGER", phone: "", mobile: "", email: "" });
      setAddingContact(false);
    } catch (err) {
      setContactError(err instanceof Error ? err.message : "Kişi eklenemedi");
    } finally {
      setSavingContact(false);
    }
  };

  const removeContact = async (contactId: string) => {
    if (!window.confirm("Bu iletişim kişisini silmek istiyor musunuz?")) return;
    setDeletingId(contactId);
    setContactError("");
    try {
      const updated = await companyService.removeContact(company.id, contactId);
      onUpdated(updated);
    } catch (err) {
      setContactError(err instanceof Error ? err.message : "Kişi silinemedi");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Section
        title="Adres & İletişim"
        action={
          editingAddress ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={savingAddress}
                onClick={() => {
                  setEditingAddress(false);
                  setAddressError("");
                }}
              >
                Vazgeç
              </Button>
              <Button size="sm" disabled={savingAddress} onClick={() => void saveAddress()}>
                {savingAddress ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditingAddress(true)}>
              Güncelle
            </Button>
          )
        }
      >
        {addressError && <p className="mb-3 text-sm text-red-600">{addressError}</p>}
        {editingAddress ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cityId">İl</Label>
              <select
                id="cityId"
                value={addressForm.cityId}
                onChange={(event) =>
                  setAddressForm((current) => ({
                    ...current,
                    cityId: event.target.value,
                    districtId: "",
                  }))
                }
                className={selectClass}
              >
                <option value="">Seçin</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="districtId">İlçe</Label>
              <select
                id="districtId"
                value={addressForm.districtId}
                disabled={!addressForm.cityId}
                onChange={(event) =>
                  setAddressForm((current) => ({ ...current, districtId: event.target.value }))
                }
                className={selectClass}
              >
                <option value="">{addressForm.cityId ? "Seçin" : "Önce il seçin"}</option>
                {districts.map((district) => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Adres</Label>
              <Textarea
                id="address"
                value={addressForm.address}
                onChange={(event) =>
                  setAddressForm((current) => ({ ...current, address: event.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={addressForm.phone}
                onChange={(event) =>
                  setAddressForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mobile">Cep</Label>
              <Input
                id="mobile"
                value={addressForm.mobile}
                onChange={(event) =>
                  setAddressForm((current) => ({ ...current, mobile: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={addressForm.email}
                onChange={(event) =>
                  setAddressForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>
          </div>
        ) : (
          <dl>
            <InfoRow label="İl" value={company.cityName} />
            <InfoRow label="İlçe" value={company.districtName} />
            <InfoRow label="Adres" value={company.address} />
            <InfoRow label="Telefon" value={company.phone} />
            <InfoRow label="Cep" value={company.mobile} />
            <InfoRow label="E-posta" value={company.email} />
          </dl>
        )}
      </Section>

      <Section
        title="İletişim Kişileri"
        action={
          !addingContact ? (
            <Button variant="outline" size="sm" onClick={() => setAddingContact(true)}>
              <UserPlus className="mr-1 h-4 w-4" />
              Yeni kişi
            </Button>
          ) : undefined
        }
      >
        {contactError && <p className="mb-3 text-sm text-red-600">{contactError}</p>}

        {company.contacts.length === 0 && !addingContact && (
          <p className="text-sm text-slate-400">Henüz iletişim kişisi yok.</p>
        )}

        <div className="space-y-3">
          {company.contacts.map((contact, i) => (
            <div key={contact.id ?? i} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl bg-slate-50 p-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200">
                <Users className="h-4 w-4 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{contact.name}</p>
                <p className="text-xs text-slate-400">{CONTACT_TYPE_LABELS[contact.contactType]}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {(contact.mobile || contact.phone) && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {contact.mobile ?? contact.phone}
                  </span>
                )}
                {contact.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {contact.email}
                  </span>
                )}
                {contact.id && (
                  <button
                    type="button"
                    disabled={deletingId === contact.id}
                    onClick={() => void removeContact(contact.id!)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    aria-label="Kişiyi sil"
                  >
                    {deletingId === contact.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {addingContact && (
          <div className="mt-4 space-y-3 rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-700">Yeni kişi</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contactName">Ad soyad</Label>
                <Input
                  id="contactName"
                  value={contactForm.name}
                  onChange={(event) => setContactForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactType">Görev</Label>
                <select
                  id="contactType"
                  value={contactForm.contactType}
                  onChange={(event) =>
                    setContactForm((current) => ({
                      ...current,
                      contactType: event.target.value as ContactType,
                    }))
                  }
                  className={selectClass}
                >
                  {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactPhone">Telefon</Label>
                <Input
                  id="contactPhone"
                  value={contactForm.phone}
                  onChange={(event) => setContactForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactMobile">Cep</Label>
                <Input
                  id="contactMobile"
                  value={contactForm.mobile}
                  onChange={(event) => setContactForm((current) => ({ ...current, mobile: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="contactEmail">E-posta</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactForm.email}
                  onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={savingContact}
                onClick={() => {
                  setAddingContact(false);
                  setContactError("");
                }}
              >
                Vazgeç
              </Button>
              <Button size="sm" disabled={savingContact} onClick={() => void addContact()}>
                {savingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ekle"}
              </Button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

/* ──────────────────────────── SMS Tab ──────────────────────────── */

function SmsTab({ company }: { company: CompanyDetail }) {
  return (
    <div className="space-y-4">
      {company.originators.length > 0 ? (
        <Section title="Başlıklar">
          <div className="space-y-2">
            {company.originators.map((o, i) => (
              <div key={o.id ?? i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="font-mono text-sm font-medium text-slate-800">{o.name}</span>
                <Badge variant="outline" className={
                  o.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  o.status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200" :
                  o.status === "PASSIVE" ? "bg-slate-100 text-slate-600 border-slate-200" :
                  "bg-red-50 text-red-600 border-red-200"
                }>
                  {ORIGINATOR_STATUS_LABELS[o.status]}
                </Badge>
              </div>
            ))}
          </div>
        </Section>
      ) : (
        <Section><EmptyState message="Henüz başlık tanımlanmamış." /></Section>
      )}

      {company.creditAlerts.length > 0 && (
        <Section title="Kredi Uyarıları">
          <div className="space-y-2">
            {company.creditAlerts.map((alert, i) => (
              <div key={alert.id ?? i} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl bg-slate-50 px-4 py-3">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 w-fit">
                  Eşik: {alert.threshold}
                </Badge>
                <span className="text-xs text-slate-500">{NOTIFICATION_TYPE_LABELS[alert.notificationType]}</span>
                {alert.message && <span className="text-xs text-slate-400 italic">{alert.message}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ──────────────────────────── Services Tab ──────────────────────────── */

function ServicesTab({
  company,
  onUpdated,
}: {
  company: CompanyDetail;
  onUpdated: (company: CompanyDetail) => void;
}) {
  const [catalog, setCatalog] = useState<Service[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    referenceService
      .getServices()
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, []);

  const assignedIds = new Set(company.services.map((item) => item.serviceId));
  const available = catalog.filter((item) => item.isActive && !assignedIds.has(item.id));

  const formatDate = (value?: string | null) => {
    if (!value) return "";
    const [year, month, day] = value.slice(0, 10).split("-");
    if (!year || !month || !day) return value;
    return `${day}.${month}.${year}`;
  };

  const addService = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    try {
      const updated = await companyService.addService(company.id, selectedId);
      onUpdated(updated);
      setSelectedId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hizmet eklenemedi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Section title="Tanımlı Hizmetler">
        {company.services.length > 0 ? (
          <div className="space-y-2">
            {company.services.map((service, i) => {
              const expired = Boolean(service.expired) || (
                Boolean(service.endDate) && service.endDate!.slice(0, 10) < new Date().toISOString().slice(0, 10)
              );
              const showTerm = service.billingPeriod === "ANNUAL" || Boolean(service.startDate || service.endDate);
              return (
              <div key={service.serviceId ?? i} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${service.isActive && !expired ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <div>
                    <span className="text-sm font-medium text-slate-800">
                      {service.serviceName ?? service.serviceId}
                      {service.serviceCode === "SMS" ? (
                        <span className="ml-2 text-xs font-normal text-slate-400">varsayılan</span>
                      ) : showTerm ? (
                        <span className="ml-2 text-xs font-normal text-slate-400">yıllık</span>
                      ) : null}
                    </span>
                    {showTerm ? (
                      <p className={`mt-0.5 text-xs ${expired ? "text-amber-700" : "text-slate-500"}`}>
                        Başlangıç <span className="font-medium text-slate-700">{formatDate(service.startDate) || "—"}</span>
                        {" · "}
                        Bitiş <span className="font-medium text-slate-700">{formatDate(service.endDate) || "—"}</span>
                        {expired
                          ? " · vadesi doldu"
                          : service.daysLeft != null
                            ? ` · ${service.daysLeft} gün kaldı`
                            : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                <Badge variant="outline" className={service.isActive && !expired ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}>
                  {expired ? "Vadesi doldu" : service.isActive ? "Aktif" : "Pasif"}
                </Badge>
                {service.serviceCode !== "SMS" ? (
                  <Switch
                    checked={service.isActive}
                    disabled={saving}
                    onCheckedChange={(checked) => {
                      if (!service.serviceId) return;
                      setSaving(true);
                      setError("");
                      void companyService
                        .setServiceActive(company.id, service.serviceId, checked)
                        .then(onUpdated)
                        .catch((err) => setError(err instanceof Error ? err.message : "Hizmet güncellenemedi"))
                        .finally(() => setSaving(false));
                    }}
                  />
                ) : null}
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Henüz hizmet tanımlanmamış.</p>
        )}

        {available.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-medium text-slate-500">Yeni hizmet ekle</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Hizmet seçin</option>
                {available.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                className="shrink-0"
                disabled={!selectedId || saving}
                onClick={() => void addService()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                Ekle
              </Button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        )}
      </Section>

      {company.ipRules.length > 0 && (
        <Section title="IP Kuralları">
          <div className="space-y-2">
            {company.ipRules.map((rule, i) => (
              <div key={rule.id ?? i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-400" />
                  <span className="font-mono text-sm font-medium text-slate-800">{rule.ipAddress}</span>
                </div>
                <span className="text-xs text-slate-400 flex-1">{rule.description ?? ""}</span>
                <StatusDot active={rule.isActive} />
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ──────────────────────────── Users Tab ──────────────────────────── */

function UsersTab({
  companyId, companyCode, users, loading, onReload,
}: {
  companyId: string;
  companyCode: string;
  users: CompanyUser[];
  loading: boolean;
  onReload: () => Promise<void>;
}) {
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [message, setMessage] = useState("");

  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPw, setShowResetPw] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleAddUser = async () => {
    if (!newUsername.trim() || newPassword.length < 6) return;
    setAddingUser(true);
    setMessage("");
    try {
      await apiRequest(`admin/companies/${companyId}/users`, {
        method: "POST",
        body: { username: newUsername.trim(), password: newPassword.trim() },
      });
      setShowAddUser(false);
      setNewUsername("");
      setNewPassword("");
      setMessage("Kullanıcı başarıyla oluşturuldu.");
      await onReload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Kullanıcı oluşturulamadı");
    } finally {
      setAddingUser(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (resetPassword.length < 6) return;
    setResetting(true);
    setMessage("");
    try {
      await apiRequest(`admin/companies/${companyId}/users/${userId}/password`, {
        method: "PATCH",
        body: { password: resetPassword.trim() },
      });
      setResetUserId(null);
      setResetPassword("");
      setMessage("Şifre başarıyla güncellendi.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Şifre güncellenemedi");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Kullanıcı Hesapları</h3>
          <p className="text-xs text-slate-400">Bu firmaya ait giriş yapabilecek kullanıcılar</p>
        </div>
        <Button
          size="sm"
          onClick={() => { setShowAddUser(true); setMessage(""); }}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl w-full sm:w-auto"
        >
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          Yeni Kullanıcı
        </Button>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${message.includes("başarı") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {message}
        </div>
      )}

      {/* Add User Form */}
      {showAddUser && (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-sm font-bold text-blue-900">Yeni Kullanıcı Ekle</h4>
            <button onClick={() => setShowAddUser(false)} className="rounded-lg p-1.5 text-blue-300 transition hover:bg-blue-100 hover:text-blue-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-blue-800">Firma Kodu</Label>
              <Input value={companyCode} disabled className="rounded-xl bg-blue-100/40 text-blue-800 font-mono border-blue-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-blue-800">Kullanıcı Adı</Label>
              <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Kullanıcı adı girin" className="rounded-xl" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium text-blue-800">Şifre</Label>
              <div className="relative">
                <Input type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="En az 6 karakter" className="rounded-xl pr-10" />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-5">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowAddUser(false)}>İptal</Button>
            <Button size="sm" disabled={addingUser || !newUsername.trim() || newPassword.length < 6} onClick={handleAddUser} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              {addingUser && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Oluştur
            </Button>
          </div>
        </div>
      )}

      {/* User List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : users.length === 0 ? (
        <Section><EmptyState message="Bu firmaya ait kullanıcı bulunmuyor." /></Section>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3.5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <Users className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{u.username}</p>
                    <p className="text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString("tr-TR")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-12 sm:pl-0">
                  <Badge variant="outline" className={
                    u.role === "ADMIN" ? "bg-blue-50 text-blue-700 border-blue-200" :
                    u.role === "DEALER" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    "bg-purple-50 text-purple-700 border-purple-200"
                  }>
                    {u.role === "ADMIN" ? "Admin" : u.role === "DEALER" ? "Bayi" : "Müşteri"}
                  </Badge>
                  <Badge variant="outline" className={u.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}>
                    {u.isActive ? "Aktif" : "Pasif"}
                  </Badge>
                  <button
                    onClick={() => { setResetUserId(resetUserId === u.id ? null : u.id); setResetPassword(""); setShowResetPw(false); setMessage(""); }}
                    className={`ml-1 rounded-lg p-1.5 transition ${resetUserId === u.id ? "bg-amber-100 text-amber-700" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}
                    title="Şifre Değiştir"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Inline password reset */}
              {resetUserId === u.id && (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3.5">
                  <p className="text-xs font-medium text-slate-600 mb-2.5">Yeni şifre belirle — <span className="text-slate-400">{u.username}</span></p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showResetPw ? "text" : "password"}
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="Yeni şifre (en az 6 karakter)"
                        className="rounded-xl pr-10 text-sm h-9"
                      />
                      <button type="button" onClick={() => setShowResetPw(!showResetPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showResetPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => setResetUserId(null)}>İptal</Button>
                      <Button
                        size="sm"
                        disabled={resetting || resetPassword.length < 6}
                        onClick={() => handleResetPassword(u.id)}
                        className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-9"
                      >
                        {resetting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                        Güncelle
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────── Pricing Tab ──────────────────────────── */

function PricingTab({
  company,
  onUpdated,
}: {
  company: CompanyDetail;
  onUpdated: (company: CompanyDetail) => void;
}) {
  const [lists, setLists] = useState<PriceList[]>([]);
  const [selectedId, setSelectedId] = useState(company.priceListId ?? "");
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedId(company.priceListId ?? "");
  }, [company.priceListId]);

  useEffect(() => {
    pricingService
      .listPriceLists()
      .then(setLists)
      .catch(() => setLists([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setItems([]);
      return;
    }
    pricingService
      .getListItems(selectedId)
      .then(setItems)
      .catch(() => setItems([]));
  }, [selectedId]);

  const compatibleLists = lists.filter((list) => {
    if (company.isDealer) return list.listType === "DEALER";
    return list.listType === "CUSTOMER";
  });
  const options = compatibleLists.filter(
    (list) => list.isActive || list.id === company.priceListId,
  );
  const currentMissing =
    company.priceListId && !options.some((list) => list.id === company.priceListId);
  const selectedList = lists.find((list) => list.id === selectedId);
  const dirty = selectedId !== (company.priceListId ?? "");

  const save = async (priceListId: string | null) => {
    setSaving(true);
    setError("");
    try {
      const updated = await companyService.update(company.id, { priceListId });
      onUpdated(updated);
      setSelectedId(updated.priceListId ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fiyat şablonu kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
    <Section
      title="Fiyat Şablonu"
      action={
        <Link href="/admin/pricing" className="text-xs font-medium text-blue-600 hover:underline">
          Şablonları yönet
        </Link>
      }
    >
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                company.priceListName ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
              }`}
            >
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Şu an atanan</p>
              <p className="truncate text-sm font-semibold text-slate-900">
                {company.priceListName ?? "Atanmamış"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="priceListId">Şablon seç</Label>
            <select
              id="priceListId"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Şablon seçin</option>
              {currentMissing && company.priceListId && (
                <option value={company.priceListId}>{company.priceListName}</option>
              )}
              {options.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({PRICE_LIST_TYPE_LABELS[list.listType]})
                </option>
              ))}
            </select>
            {options.length === 0 && (
              <p className="text-xs text-slate-500">
                {company.isDealer ? "Bayi" : "Müşteri"} tipi uygun şablon yok. Önce fiyat yönetiminde oluşturun.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!dirty || saving} onClick={() => void save(selectedId || null)}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : company.priceListId ? "Şablonu güncelle" : "Şablon ata"}
            </Button>
            {company.priceListId && (
              <Button
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => void save(null)}
              >
                Atamayı kaldır
              </Button>
            )}
          </div>

          {selectedList && items.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500">
                {selectedList.name} önizleme
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-2 text-left font-medium text-slate-500">Ürün</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-500">
                      Birim fiyat ({selectedList.currency})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-2 text-slate-800">{item.productName ?? item.productCode}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                        {Number(item.unitPrice).toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Section>
    <SmsRoutingSection company={company} onUpdated={onUpdated} />
    </div>
  );
}

function primarySmsAccount(company: CompanyDetail) {
  return company.smsAccounts?.find((account) => account.isActive) ?? company.smsAccounts?.[0];
}

function SmsRoutingSection({
  company,
  onUpdated,
}: {
  company: CompanyDetail;
  onUpdated: (company: CompanyDetail) => void;
}) {
  const account = primarySmsAccount(company);
  const currentProviderId = account?.providerId ?? "";
  const currentRate =
    account?.creditRefundRate == null ? null : Number(account.creditRefundRate);
  const hasRate = currentRate != null && Number.isFinite(currentRate);

  const [providers, setProviders] = useState<SmsProvider[]>([]);
  const [providerId, setProviderId] = useState(currentProviderId);
  const [enableRefund, setEnableRefund] = useState(hasRate);
  const [refundRate, setRefundRate] = useState(hasRate ? formatCreditRefundRate(currentRate) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    referenceService
      .getSmsProviders()
      .then((items) => setProviders(items.filter((item) => item.isActive)))
      .catch(() => setProviders([]));
  }, []);

  useEffect(() => {
    setProviderId(currentProviderId);
    setEnableRefund(hasRate);
    setRefundRate(hasRate ? formatCreditRefundRate(currentRate) : "");
    setError("");
  }, [company.id, currentProviderId, hasRate, currentRate]);

  const nextRate = enableRefund ? parseCreditRefundRate(refundRate) : null;
  const providerDirty = Boolean(providerId) && providerId !== currentProviderId;
  const refundDirty = enableRefund ? nextRate !== (hasRate ? currentRate : null) : hasRate;
  const canSave =
    Boolean(providerId) &&
    !(enableRefund && nextRate == null) &&
    (providerDirty || refundDirty);

  const save = async () => {
    if (!canSave || !providerId) return;
    setSaving(true);
    setError("");
    try {
      const updated = await companyService.updateSmsProvider(company.id, {
        providerId,
        creditRefundRate: enableRefund ? nextRate : null,
      });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sağlayıcı kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const currentProviderName =
    account?.providerName ?? providers.find((item) => item.id === currentProviderId)?.name;

  return (
    <Section title="SMS Sağlayıcı ve İade">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Radio className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Şu an atanan</p>
            <p className="truncate text-sm font-semibold text-slate-900">
              {currentProviderName || "Atanmamış"}
            </p>
            <p className="text-xs text-slate-400">
              {displayCreditRefundRate(hasRate ? currentRate : null)
                ? `İade ${displayCreditRefundRate(hasRate ? currentRate : null)}`
                : "İade oranı yok"}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="smsProviderId">Sağlayıcı</Label>
          <select
            id="smsProviderId"
            value={providerId}
            onChange={(event) => setProviderId(event.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Sağlayıcı seçin</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>

        <CreditRefundFields
          enabled={enableRefund}
          rate={refundRate}
          onEnabledChange={setEnableRefund}
          onRateChange={setRefundRate}
        />

        {providerDirty && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5">
            <p className="text-xs font-medium text-amber-800">Dikkat</p>
            <p className="mt-1 text-xs leading-5 text-amber-700">
              Sağlayıcı değişince bu firmanın SMS gönderimleri yeni operatör üzerinden gider.
              Mevcut hesap bilgileri korunur.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button size="sm" disabled={!canSave || saving} onClick={() => void save()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
        </Button>
      </div>
    </Section>
  );
}
