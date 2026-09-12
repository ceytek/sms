"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import {
  CompanyDetail,
  COMPANY_TYPE_LABELS,
  COMPANY_STATUS_LABELS,
  CONTACT_TYPE_LABELS,
  NOTIFICATION_TYPE_LABELS,
  ORIGINATOR_STATUS_LABELS,
} from "../types";

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

export function CompanyDetailView({ company }: CompanyDetailViewProps) {
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
        <SummaryCard
          icon={company.documentsCompleted ? <FileCheck className="h-5 w-5" /> : <FileX className="h-5 w-5" />}
          iconBg={company.documentsCompleted ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-500"}
          label="Evrak Durumu"
          value={company.documentsCompleted ? "Tamamlandı" : "Tamamlanmadı"}
          muted={!company.documentsCompleted}
        />
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
          {activeTab === "overview" && <OverviewTab company={company} />}
          {activeTab === "contact" && <ContactTab company={company} />}
          {activeTab === "sms" && <SmsTab company={company} />}
          {activeTab === "services" && <ServicesTab company={company} />}
          {activeTab === "users" && (
            <UsersTab
              companyId={company.id}
              companyCode={company.companyCode}
              users={users}
              loading={loadingUsers}
              onReload={loadUsers}
            />
          )}
          {activeTab === "pricing" && <PricingTab company={company} />}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────── Summary Card ──────────────────────────── */

function SummaryCard({ icon, iconBg, label, value, muted }: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-400">{label}</p>
          <p className={`text-base font-bold truncate ${muted ? "text-slate-400" : "text-slate-900"}`}>{value}</p>
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

function OverviewTab({ company }: { company: CompanyDetail }) {
  return (
    <div className="space-y-4">
      <Section title="Firma Bilgileri">
        <dl>
          <InfoRow label="Hesap Türü" value={company.isDealer ? "Bayi" : "Müşteri"} />
          <InfoRow label="Firma Tipi" value={COMPANY_TYPE_LABELS[company.companyType]} />
          <InfoRow label="Vergi Dairesi" value={company.taxOffice} />
          <InfoRow label="Vergi No" value={company.taxNumber} />
          <InfoRow label="TC Kimlik No" value={company.nationalId} />
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

function ContactTab({ company }: { company: CompanyDetail }) {
  return (
    <div className="space-y-4">
      <Section title="Adres & İletişim">
        <dl>
          <InfoRow label="İl" value={company.cityName} />
          <InfoRow label="İlçe" value={company.districtName} />
          <InfoRow label="Adres" value={company.address} />
          <InfoRow label="Telefon" value={company.phone} />
          <InfoRow label="Cep" value={company.mobile} />
          <InfoRow label="E-posta" value={company.email} />
        </dl>
      </Section>

      {company.contacts.length > 0 && (
        <Section title="İletişim Kişileri">
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
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
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
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
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
                  o.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  o.status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200" :
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

function ServicesTab({ company }: { company: CompanyDetail }) {
  return (
    <div className="space-y-4">
      {company.services.length > 0 ? (
        <Section title="Tanımlı Hizmetler">
          <div className="space-y-2">
            {company.services.map((service, i) => (
              <div key={service.serviceId ?? i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${service.isActive ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span className="text-sm font-medium text-slate-800">{service.serviceName ?? service.serviceId}</span>
                </div>
                <Badge variant="outline" className={service.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}>
                  {service.isActive ? "Aktif" : "Pasif"}
                </Badge>
              </div>
            ))}
          </div>
        </Section>
      ) : (
        <Section><EmptyState message="Henüz hizmet tanımlanmamış." /></Section>
      )}

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

function PricingTab({ company }: { company: CompanyDetail }) {
  return (
    <div>
      {company.priceListName ? (
        <Section>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
              <CreditCard className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Atanmış Fiyat Şablonu</p>
              <p className="text-lg font-bold text-slate-900">{company.priceListName}</p>
            </div>
          </div>
        </Section>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 mb-3">
            <CreditCard className="h-6 w-6 text-amber-500" />
          </div>
          <p className="text-sm font-medium text-amber-700">Fiyat listesi atanmamış</p>
          <p className="mt-1 text-xs text-amber-400">Firma oluşturulurken fiyat şablonu atanabilir</p>
        </div>
      )}
    </div>
  );
}
