"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  Building2,
  Download,
  FileSpreadsheet,
  Loader2,
  PhoneOff,
  Plus,
  Search,
  Send,
  Tags,
  Upload,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { contactsService } from "../services/contacts.service";
import { contactGroupsService } from "../services/groups.service";
import { contactTagsService } from "../services/tags.service";
import { contactCustomFieldsService } from "../services/custom-fields.service";
import { contactImportsService } from "../services/imports.service";
import { ContactFormDialog } from "./contact-form-dialog";
import { ExcelImportDialog } from "./excel-import-dialog";
import { BulkNumbersDialog } from "./bulk-numbers-dialog";
import { CompanyImportDialog } from "./company-import-dialog";
import { ContactStatusBadge } from "./status-badge";
import type {
  ContactBulkAction,
  ContactGroupRecord,
  ContactRecord,
  ContactSource,
  ContactStatus,
  ContactSummary,
  ContactTagRecord,
  ContactCustomFieldRecord,
  ImportJobRecord,
} from "../types";
import {
  CONTACT_SOURCE_LABELS,
  CONTACT_STATUS_LABELS,
  IMPORT_TYPE_LABELS,
  selectClass,
} from "../types";

type Dialog = "create" | "edit" | "excel" | "bulk" | "company" | null;

export function ContactsPage() {
  const [items, setItems] = useState<ContactRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<ContactSummary | null>(null);
  const [groups, setGroups] = useState<ContactGroupRecord[]>([]);
  const [tags, setTags] = useState<ContactTagRecord[]>([]);
  const [customFields, setCustomFields] = useState<ContactCustomFieldRecord[]>([]);
  const [jobs, setJobs] = useState<ImportJobRecord[]>([]);
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState("");
  const [tagId, setTagId] = useState("");
  const [source, setSource] = useState<ContactSource | "ALL">("ALL");
  const [status, setStatus] = useState<ContactStatus | "ALL">("ALL");
  const [selected, setSelected] = useState<string[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [editing, setEditing] = useState<ContactRecord | null>(null);
  const [bulkAction, setBulkAction] = useState<ContactBulkAction>("ADD_TO_GROUP");
  const [bulkTarget, setBulkTarget] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const limit = 20;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, nextSummary, nextGroups, nextTags, nextFields, nextJobs] = await Promise.all([
        contactsService.list({
          search,
          groupId: groupId || undefined,
          tagId: tagId || undefined,
          source,
          status,
          page,
          limit,
        }),
        contactsService.summary(),
        contactGroupsService.list(),
        contactTagsService.list(),
        contactCustomFieldsService.list(),
        contactImportsService.listJobs(),
      ]);
      setItems(list.items);
      setTotal(list.total);
      setSummary(nextSummary);
      setGroups(nextGroups);
      setTags(nextTags);
      setCustomFields(nextFields);
      setJobs(nextJobs.slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rehber yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [search, groupId, tagId, source, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const allChecked = items.length > 0 && items.every((item) => selected.includes(item.id));
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const runBulk = async () => {
    if (!selected.length) return;
    setError("");
    try {
      await contactsService.bulkAction({
        action: bulkAction,
        ids: selected,
        groupId: bulkAction.includes("GROUP") ? bulkTarget || undefined : undefined,
        tagId: bulkAction.includes("TAG") ? bulkTarget || undefined : undefined,
      });
      setSelected([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toplu işlem başarısız");
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rehber</h1>
          <p className="text-sm text-slate-500">Kişilerinizi yönetin, gruplar oluşturun ve toplu SMS gönderimlerinde kullanın.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDialog("excel")}><Upload className="mr-2 h-4 w-4" />Excel / CSV Aktar</Button>
          <Button variant="outline" onClick={() => setDialog("bulk")}><Send className="mr-2 h-4 w-4" />Toplu Numara Ekle</Button>
          <Button variant="outline" onClick={() => void contactsService.export({ format: "xlsx", groupId, tagId, source: source === "ALL" ? undefined : source, status: status === "ALL" ? undefined : status, search })}>
            <Download className="mr-2 h-4 w-4" />Dışa Aktar
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => { setEditing(null); setDialog("create"); }}>
            <Plus className="mr-2 h-4 w-4" />Kişi Ekle
          </Button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard icon={<Users className="h-5 w-5" />} label="Toplam Kişi" value={summary?.total ?? 0} color="text-blue-600 bg-blue-50" />
        <SummaryCard icon={<Send className="h-5 w-5" />} label="Aktif Numara" value={summary?.active ?? 0} color="text-emerald-600 bg-emerald-50" />
        <SummaryCard icon={<Tags className="h-5 w-5" />} label="Grup Sayısı" value={summary?.groupCount ?? 0} color="text-violet-600 bg-violet-50" />
        <SummaryCard icon={<Ban className="h-5 w-5" />} label="Yasaklı" value={summary?.blacklist ?? 0} color="text-red-600 bg-red-50" href="/customer/contacts/blocked" />
        <SummaryCard icon={<PhoneOff className="h-5 w-5" />} label="SMS Gönderilmeyecek" value={summary?.smsBlocked ?? 0} color="text-amber-600 bg-amber-50" href="/customer/contacts/sms-blocked" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input className="pl-9" placeholder="Ad, telefon, firma ara..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className={`${selectClass} w-40`} value={groupId} onChange={(e) => { setGroupId(e.target.value); setPage(1); }}>
              <option value="">Tüm Gruplar</option>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
            <select className={`${selectClass} w-40`} value={tagId} onChange={(e) => { setTagId(e.target.value); setPage(1); }}>
              <option value="">Tüm Etiketler</option>
              {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
            </select>
            <select className={`${selectClass} w-40`} value={source} onChange={(e) => { setSource(e.target.value as ContactSource | "ALL"); setPage(1); }}>
              <option value="ALL">Tüm Kaynaklar</option>
              {Object.entries(CONTACT_SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <select className={`${selectClass} w-40`} value={status} onChange={(e) => { setStatus(e.target.value as ContactStatus | "ALL"); setPage(1); }}>
              <option value="ALL">Tüm Durumlar</option>
              {Object.entries(CONTACT_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm">
              <span className="font-medium">{selected.length} kişi seçildi</span>
              <select className={`${selectClass} w-44`} value={bulkAction} onChange={(e) => setBulkAction(e.target.value as ContactBulkAction)}>
                <option value="ADD_TO_GROUP">Gruba Ekle</option>
                <option value="REMOVE_FROM_GROUP">Gruptan Çıkar</option>
                <option value="ADD_TAG">Etiket Ekle</option>
                <option value="REMOVE_TAG">Etiket Kaldır</option>
                <option value="ACTIVATE">Aktif Yap</option>
                <option value="DEACTIVATE">Pasife Al</option>
                <option value="BLACKLIST">Yasaklı</option>
                <option value="SMS_BLOCK">SMS Gönderilmeyecek</option>
                <option value="DELETE">Sil</option>
              </select>
              {(bulkAction.includes("GROUP") || bulkAction.includes("TAG")) && (
                <select className={`${selectClass} w-44`} value={bulkTarget} onChange={(e) => setBulkTarget(e.target.value)}>
                  <option value="">Seçin</option>
                  {(bulkAction.includes("GROUP") ? groups : tags).map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              )}
              <Button size="sm" onClick={() => void runBulk()}>Uygula</Button>
              <Button size="sm" variant="outline" onClick={() => void contactsService.export({ format: "xlsx", ids: selected.join(",") })}>Seçilenleri Dışa Aktar</Button>
            </div>
          )}

          {error && <p className="px-4 pt-3 text-sm text-red-600">{error}</p>}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" checked={allChecked} onChange={(e) => setSelected(e.target.checked ? items.map((item) => item.id) : [])} />
                </TableHead>
                <TableHead>Ad Soyad</TableHead>
                <TableHead>Cep Telefonu</TableHead>
                <TableHead>Firma</TableHead>
                <TableHead>Gruplar</TableHead>
                <TableHead>Etiketler</TableHead>
                <TableHead>Kaynak</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-slate-400">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                  </TableCell>
                </TableRow>
              )}
              {!loading && items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedSet.has(item.id)}
                      onChange={(e) => setSelected((current) => e.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{`${item.firstName} ${item.lastName}`.trim() || "—"}</TableCell>
                  <TableCell>{item.formattedPhone}</TableCell>
                  <TableCell>{item.companyName || "—"}</TableCell>
                  <TableCell className="text-slate-500">{item.groups.map((group) => group.name).join(", ") || "—"}</TableCell>
                  <TableCell className="text-slate-500">{item.tags.map((tag) => tag.name).join(", ") || "—"}</TableCell>
                  <TableCell>{CONTACT_SOURCE_LABELS[item.source]}</TableCell>
                  <TableCell><ContactStatusBadge status={item.status} /></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(item); setDialog("edit"); }}>Düzenle</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && !items.length && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-slate-400">Henüz kişi yok</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-500">
            <span>Toplam {total} kayıt</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Önceki</Button>
              <span>{page} / {pageCount}</span>
              <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Sonraki</Button>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-semibold text-slate-900">Hızlı İşlemler</h3>
            <div className="space-y-2">
              <QuickButton icon={<Plus className="h-4 w-4" />} label="Kişi Ekle" onClick={() => { setEditing(null); setDialog("create"); }} />
              <QuickButton icon={<FileSpreadsheet className="h-4 w-4" />} label="Excel / CSV Aktar" onClick={() => setDialog("excel")} />
              <QuickButton icon={<PhoneOff className="h-4 w-4" />} label="Toplu Numara Ekle" onClick={() => setDialog("bulk")} />
              <QuickButton icon={<Building2 className="h-4 w-4" />} label="Firma Kayıtlarından Aktar" onClick={() => setDialog("company")} />
              <Link href="/customer/contacts/groups" className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Grupları Yönet
              </Link>
              <Link href="/customer/contacts/fields" className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Özel Alanlar
              </Link>
              <Link href="/customer/contacts/blocked" className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Yasaklı
              </Link>
              <Link href="/customer/contacts/sms-blocked" className="flex items-center justify-between rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
                SMS Gönderilmeyecek
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Son Aktarımlar</h3>
              <Link href="/customer/contacts/imports" className="text-xs text-blue-600">Tümünü Gör</Link>
            </div>
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="text-sm">
                  <p className="font-medium text-slate-800">{job.fileName}</p>
                  <p className="text-xs text-slate-500">{IMPORT_TYPE_LABELS[job.importType]} · {job.successfulRows || job.validRows} / {job.totalRows}</p>
                </div>
              ))}
              {!jobs.length && <p className="text-sm text-slate-400">Aktarım yok</p>}
            </div>
          </div>
        </aside>
      </div>

      {(dialog === "create" || dialog === "edit") && (
        <ContactFormDialog
          contact={dialog === "edit" ? editing : null}
          groups={groups}
          tags={tags}
          customFields={customFields}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); void load(); }}
        />
      )}
      {dialog === "excel" && (
        <ExcelImportDialog
          groups={groups}
          customFields={customFields}
          onClose={() => setDialog(null)}
          onDone={() => { setDialog(null); void load(); }}
        />
      )}
      {dialog === "bulk" && <BulkNumbersDialog groups={groups} onClose={() => setDialog(null)} onDone={() => { setDialog(null); void load(); }} />}
      {dialog === "company" && <CompanyImportDialog groups={groups} onClose={() => setDialog(null)} onDone={() => { setDialog(null); void load(); }} />}
    </div>
  );
}

function SummaryCard({ icon, label, value, color, href }: { icon: React.ReactNode; label: string; value: number; color: string; href?: string }) {
  const inner = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>{icon}</div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function QuickButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
      {icon}
      {label}
    </button>
  );
}
