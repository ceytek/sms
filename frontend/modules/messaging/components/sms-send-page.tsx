"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookUser,
  CalendarClock,
  Check,
  FileSpreadsheet,
  Info,
  Loader2,
  Save,
  Search,
  Sparkles,
  Trash2,
  Upload,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { creditsService } from "@/modules/credits/services/credits.service";
import { contactGroupsService } from "@/modules/contacts/services/groups.service";
import { contactsService } from "@/modules/contacts/services/contacts.service";
import { originatorRestrictionsService } from "@/modules/contacts/services/originator-restrictions.service";
import { formatTrMobile, normalizeTrMobile, parseGsmNumbers } from "@/lib/phone";
import { parseSmsSpreadsheet } from "@/lib/parse-sms-spreadsheet";
import { previewSmsTemplate, smsEncodingAndParts, smsProgress } from "../sms-text";
import { smsSendService, type SmsSourceType } from "../services/sms-send.service";
import type { ContactGroupRecord, ContactRecord } from "@/modules/contacts/types";

type BasketItem = {
  key: string;
  type: SmsSourceType;
  label: string;
  groupId?: string;
  contactIds?: string[];
  excludedContactIds?: string[];
  phones?: string[];
  rawCount: number;
  file?: File;
};

const SEND_KINDS = [
  {
    id: "BULK",
    title: "Toplu SMS",
    description: "Grup, rehber, Excel veya manuel numaralar ile gönderin.",
    detail: "Rehber, grup, kişi listesi, Excel veya manuel numaralar ile toplu gönderim yapabilirsiniz.",
    icon: Users,
    tone: "bg-blue-50 text-blue-600",
  },
  {
    id: "SINGLE",
    title: "Tekil SMS",
    description: "Tek bir numaraya gönderin.",
    detail: "Mesaj yalnızca seçtiğiniz tek GSM numarasına gider.",
    icon: User,
    tone: "bg-sky-50 text-sky-600",
  },
  {
    id: "PERSONALIZED",
    title: "Kişiselleştirilmiş SMS",
    description: "Her kişiye özel mesaj gönderin.",
    detail: "Mesajdaki {ad}, {firma} gibi alanlar her alıcı için ayrıca doldurulur.",
    icon: Sparkles,
    tone: "bg-violet-50 text-violet-600",
  },
  {
    id: "SCHEDULED",
    title: "Planlı Gönderim",
    description: "İleri tarihli gönderim yapın.",
    detail: "Alıcı listesi hazırlanır, gönderim seçtiğiniz tarih ve saatte başlar.",
    icon: CalendarClock,
    tone: "bg-indigo-50 text-indigo-600",
  },
] as const;

const CAMPAIGN_CATEGORIES = [
  { value: "DUYURU", label: "Duyuru" },
  { value: "BILGILENDIRME", label: "Bilgilendirme" },
  { value: "HATIRLATMA", label: "Hatırlatma" },
  { value: "KAMPANYA", label: "Kampanya" },
  { value: "DIGER", label: "Diğer" },
];

type SendKind = (typeof SEND_KINDS)[number]["id"];

const STEPS = [
  { id: 1, label: "Gönderim Türü" },
  { id: 2, label: "Kitle Seçimi" },
  { id: 3, label: "Mesaj" },
  { id: 4, label: "Özet" },
] as const;

const VARIABLES = [
  { token: "{firma}", label: "{firma}" },
  { token: "{yetkili}", label: "{yetkili}" },
  { token: "{ad}", label: "{ad}" },
  { token: "{soyad}", label: "{soyad}" },
  { token: "{telefon}", label: "{telefon}" },
  { token: "{email}", label: "{email}" },
];

const selectClass =
  "flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

export function SmsSendPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [groups, setGroups] = useState<ContactGroupRecord[]>([]);
  const [originators, setOriginators] = useState<{ id: string; name: string }[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string; body: string }[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [groupQuery, setGroupQuery] = useState("");
  const [audienceTab, setAudienceTab] = useState<"groups" | "manual" | "file" | "people">("groups");
  const [pickOpen, setPickOpen] = useState(false);
  const [pickContacts, setPickContacts] = useState<ContactRecord[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [manual, setManual] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [body, setBody] = useState("");
  const [originatorId, setOriginatorId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [category, setCategory] = useState("DUYURU");
  const [kind, setKind] = useState<SendKind>("BULK");
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateHint, setTemplateHint] = useState("");
  const [restricted, setRestricted] = useState<{ blacklist: string[]; smsBlocked: string[]; total: number } | null>(null);
  const [blacklistPhones, setBlacklistPhones] = useState<Set<string>>(new Set());
  const [smsBlockedPhones, setSmsBlockedPhones] = useState<Set<string>>(new Set());
  const [restrictHint, setRestrictHint] = useState("");
  const [restrictionsReady, setRestrictionsReady] = useState(false);
  const [smsBalance, setSmsBalance] = useState<number | null>(null);
  const key = useMemo(() => crypto.randomUUID(), []);

  const progress = smsProgress(body);
  const { parts } = smsEncodingAndParts(body);
  const previewBody = previewSmsTemplate(body);
  const previewProgress = smsProgress(previewBody);
  const rawCount = basket.reduce((sum, item) => sum + item.rawCount, 0);
  const estimatedUnits = rawCount * parts;
  const creditShort = smsBalance != null && estimatedUnits > smsBalance;

  useEffect(() => {
    void contactGroupsService.list().then(setGroups).catch(() => setGroups([]));
    void smsSendService
      .originators()
      .then((res) => {
        setOriginators(res.items ?? []);
        const repeat = readSmsRepeat();
        if (repeat?.originatorId) setOriginatorId(repeat.originatorId);
        else if (res.items?.[0]) setOriginatorId(res.items[0].id);
        if (repeat?.body) setBody(repeat.body);
        if (repeat?.phones?.length) {
          setManual(repeat.phones.join("\n"));
          setBasket([
            {
              key: "repeat",
              type: "MANUAL",
              label: "Önceki kampanya",
              phones: repeat.phones,
              rawCount: repeat.phones.length,
            },
          ]);
          setStep(3);
        }
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Originatörler yüklenemedi"));
    void smsSendService
      .templates()
      .then((res) => setTemplates(res.items ?? []))
      .catch(() => setTemplates([]));
    void creditsService
      .me()
      .then((balance) => setSmsBalance(Number(balance.smsBalance)))
      .catch(() => setSmsBalance(null));
    void Promise.all([
      originatorRestrictionsService.list({ type: "BLACKLIST", limit: 200 }),
      originatorRestrictionsService.list({ type: "SMS_BLOCKED", limit: 200 }),
    ])
      .then(([black, sms]) => {
        setBlacklistPhones(phonesFromRestrictions(black.items));
        setSmsBlockedPhones(phonesFromRestrictions(sms.items));
      })
      .catch(() => undefined)
      .finally(() => setRestrictionsReady(true));
  }, []);

  const classifyPhone = (raw?: string, contactStatus?: string) => {
    if (contactStatus === "BLACKLIST") return "BLACKLIST" as const;
    if (contactStatus === "SMS_BLOCKED") return "SMS_BLOCKED" as const;
    const normalized = normalizeTrMobile(raw);
    if (!normalized) return null;
    if (blacklistPhones.has(normalized)) return "BLACKLIST" as const;
    if (smsBlockedPhones.has(normalized)) return "SMS_BLOCKED" as const;
    return null;
  };

  const partitionContacts = (items: ContactRecord[]) => {
    const allowed: ContactRecord[] = [];
    const excludedIds: string[] = [];
    const blockedLabels: string[] = [];
    for (const item of items) {
      const reason = classifyPhone(item.normalizedPhone || item.mobilePhone, item.status);
      if (reason) {
        excludedIds.push(item.id);
        blockedLabels.push(formatTrMobile(item.normalizedPhone) || item.formattedPhone || item.mobilePhone);
      } else {
        allowed.push(item);
      }
    }
    return { allowed, excludedIds, blockedLabels };
  };

  const localRestricted = useMemo(() => {
    const blacklist: string[] = [];
    const smsBlocked: string[] = [];
    for (const item of basket) {
      for (const phone of item.phones ?? []) {
        const reason = classifyPhone(phone);
        const formatted = formatTrMobile(normalizeTrMobile(phone)) || phone;
        if (reason === "BLACKLIST") blacklist.push(formatted);
        if (reason === "SMS_BLOCKED") smsBlocked.push(formatted);
      }
    }
    return { blacklist, smsBlocked, total: blacklist.length + smsBlocked.length };
  }, [basket, blacklistPhones, smsBlockedPhones]);

  useEffect(() => {
    if (step !== 4 || !originatorId) return;
    const phones = basket.flatMap((item) => item.phones ?? []);
    const contactIds = basket.flatMap((item) => item.contactIds ?? []);
    if (!phones.length && !contactIds.length) return;
    void smsSendService
      .checkRestricted({ originatorId, phones, contactIds })
      .then(setRestricted)
      .catch(() => undefined);
  }, [step, originatorId, basket]);

  const shownRestricted = restricted && restricted.total > 0 ? restricted : localRestricted;

  useEffect(() => {
    const needs = basket.filter(
      (item) =>
        item.phones === undefined &&
        ((item.contactIds?.length && item.groupId) || (item.type === "CONTACT_GROUP" && item.groupId) || item.type === "CONTACT_BOOK"),
    );
    if (!restrictionsReady || !needs.length) return;
    let cancelled = false;
    void (async () => {
      const updates = new Map<
        string,
        { phones: string[]; contactIds?: string[]; excludedContactIds?: string[]; rawCount: number; blockedLabels: string[] }
      >();
      for (const item of needs) {
        const res = await contactsService.list({
          groupId: item.type === "CONTACT_BOOK" ? undefined : item.groupId,
          limit: 200,
        });
        const members = res.items ?? [];
        const selected =
          item.type === "CONTACT_PICK" && item.contactIds?.length
            ? members.filter((row) => item.contactIds?.includes(row.id))
            : members;
        const { allowed, excludedIds, blockedLabels } = partitionContacts(selected);
        updates.set(item.key, {
          contactIds: item.type === "CONTACT_PICK" ? allowed.map((row) => row.id) : item.contactIds,
          excludedContactIds: item.type === "CONTACT_GROUP" || item.type === "CONTACT_BOOK" ? excludedIds : item.excludedContactIds,
          phones: allowed.map((row) => row.normalizedPhone || row.mobilePhone),
          rawCount: allowed.length,
          blockedLabels,
        });
      }
      if (cancelled) return;
      const allBlocked = [...updates.values()].flatMap((row) => row.blockedLabels);
      if (allBlocked.length) {
        setRestrictHint(`${allBlocked.join(", ")} yasaklı / SMS gönderilmeyecek listesinde. SMS gitmez, sepetten çıkarıldı.`);
      }
      setBasket((prev) =>
        prev.flatMap((item) => {
          const update = updates.get(item.key);
          if (!update) return [item];
          if (!update.rawCount) return [];
          return [
            {
              ...item,
              contactIds: update.contactIds,
              excludedContactIds: update.excludedContactIds,
              phones: update.phones,
              rawCount: update.rawCount,
            },
          ];
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [basket, restrictionsReady, blacklistPhones, smsBlockedPhones]);

  const addGroup = async (id = groupId) => {
    const group = groups.find((item) => item.id === id);
    if (!group) return;
    const res = await contactsService.list({ groupId: group.id, limit: 200 });
    const { allowed, excludedIds, blockedLabels } = partitionContacts(res.items ?? []);
    setRestrictHint(
      blockedLabels.length
        ? `${blockedLabels.join(", ")} yasaklı / SMS gönderilmeyecek listesinde. SMS gitmez, gruptan çıkarıldı.`
        : "",
    );
    if (!allowed.length) return;
    setBasket((prev) => {
      if (prev.some((item) => item.type === "CONTACT_GROUP" && item.groupId === group.id)) return prev;
      return [
        ...prev,
        {
          key: crypto.randomUUID(),
          type: "CONTACT_GROUP",
          label: group.name,
          groupId: group.id,
          excludedContactIds: excludedIds,
          phones: allowed.map((item) => item.normalizedPhone || item.mobilePhone),
          rawCount: allowed.length,
        },
      ];
    });
  };

  const openPick = async (id = groupId) => {
    if (!id) return;
    setGroupId(id);
    const res = await contactsService.list({ groupId: id, limit: 100 });
    setPickContacts(res.items ?? []);
    setPicked([]);
    setPickOpen(true);
  };

  const addPicked = () => {
    const group = groups.find((item) => item.id === groupId);
    if (!picked.length) return;
    const selected = pickContacts.filter((item) => picked.includes(item.id));
    const blockedLabels: string[] = [];
    const allowed = selected.filter((item) => {
      const reason = classifyPhone(item.normalizedPhone || item.mobilePhone, item.status);
      if (!reason) return true;
      blockedLabels.push(formatTrMobile(item.normalizedPhone) || item.formattedPhone || item.mobilePhone);
      return false;
    });
    setRestrictHint(
      blockedLabels.length
        ? `${blockedLabels.join(", ")} yasaklı / SMS gönderilmeyecek listesinde. SMS gitmez, sepete eklenmedi.`
        : "",
    );
    if (!allowed.length) {
      setPickOpen(false);
      setPicked([]);
      return;
    }
    setBasket((prev) => {
      const existing = prev.find((item) => item.type === "CONTACT_PICK" && (group ? item.groupId === group.id : !item.groupId));
      const mergedIds = uniqueIds([...(existing?.contactIds ?? []), ...allowed.map((item) => item.id)]);
      const mergedPhones = uniquePhones([
        ...(existing?.phones ?? []),
        ...allowed.map((item) => item.normalizedPhone || item.mobilePhone),
      ]);
      const nextItem: BasketItem = {
        key: existing?.key ?? crypto.randomUUID(),
        type: "CONTACT_PICK",
        label: group ? `${group.name} (seçili)` : "Seçili kişiler",
        groupId: group?.id,
        contactIds: mergedIds,
        phones: mergedPhones,
        rawCount: mergedIds.length,
      };
      return existing ? prev.map((item) => (item.key === existing.key ? nextItem : item)) : [...prev, nextItem];
    });
    setPickOpen(false);
    setPicked([]);
  };

  const addManual = () => {
    const parsed = parseGsmNumbers(manual);
    const blockedLabels: string[] = [];
    const allowed = parsed.valid.filter((phone) => {
      const reason = classifyPhone(phone);
      if (!reason) return true;
      blockedLabels.push(formatTrMobile(phone));
      return false;
    });
    setRestrictHint(phoneHint(blockedLabels, parsed.rejected));
    if (!allowed.length) return;
    setBasket((prev) => {
      const existing = prev.find((item) => item.type === "MANUAL");
      const merged = parseGsmNumbers([...(existing?.phones ?? []), ...allowed].join("\n")).valid;
      const nextItem: BasketItem = {
        key: existing?.key ?? crypto.randomUUID(),
        type: "MANUAL",
        label: "Manuel numaralar",
        phones: merged,
        rawCount: merged.length,
      };
      return existing ? prev.map((item) => (item.key === existing.key ? nextItem : item)) : [...prev, nextItem];
    });
    setManual("");
  };

  const addFile = async () => {
    if (!file) return;
    try {
      const extracted = parseGsmNumbers((await parseSmsSpreadsheet(file)).join("\n"));
      const blockedLabels: string[] = [];
      const allowed = extracted.valid.filter((phone) => {
        const reason = classifyPhone(phone);
        if (!reason) return true;
        blockedLabels.push(formatTrMobile(phone));
        return false;
      });
      const hint = phoneHint(blockedLabels, extracted.rejected);
      setRestrictHint(hint);
      if (!allowed.length) {
        setRestrictHint(hint || "Dosyada geçerli telefon bulunamadı. İlk satırda Telefon sütunu olmalı.");
        return;
      }
      setBasket((prev) => {
        if (prev.some((item) => item.type === "FILE" && item.label === file.name)) return prev;
        return [
          ...prev,
          {
            key: crypto.randomUUID(),
            type: "FILE",
            label: file.name,
            phones: allowed,
            rawCount: allowed.length,
            file,
          },
        ];
      });
      setFile(null);
    } catch {
      setRestrictHint("Excel okunamadı. xlsx, csv veya txt yükleyin.");
    }
  };

  const addBook = async () => {
    const res = await contactsService.list({ limit: 200 });
    const { allowed, excludedIds, blockedLabels } = partitionContacts(res.items ?? []);
    setRestrictHint(
      blockedLabels.length
        ? `${blockedLabels.join(", ")} yasaklı / SMS gönderilmeyecek listesinde. SMS gitmez, rehberden çıkarıldı.`
        : "",
    );
    if (!allowed.length) return;
    setBasket((prev) => {
      if (prev.some((item) => item.type === "CONTACT_BOOK")) return prev;
      return [
        ...prev,
        {
          key: crypto.randomUUID(),
          type: "CONTACT_BOOK",
          label: "Tüm rehber",
          excludedContactIds: excludedIds,
          phones: allowed.map((item) => item.normalizedPhone || item.mobilePhone),
          rawCount: allowed.length,
        },
      ];
    });
  };

  const toggleGroup = (id: string) => {
    if (basket.some((item) => item.type === "CONTACT_GROUP" && item.groupId === id)) {
      setBasket((prev) => prev.filter((item) => !(item.type === "CONTACT_GROUP" && item.groupId === id)));
      return;
    }
    void addGroup(id);
  };

  const toggleBook = () => {
    if (basket.some((item) => item.type === "CONTACT_BOOK")) {
      setBasket((prev) => prev.filter((item) => item.type !== "CONTACT_BOOK"));
      return;
    }
    void addBook();
  };

  const clearAudience = () => {
    setBasket([]);
    setPicked([]);
    setPickOpen(false);
    setFile(null);
    setRestrictHint("");
  };

  const insertToken = (token: string) => {
    setBody((prev) => (prev ? `${prev}${prev.endsWith(" ") ? "" : " "}${token}` : token));
  };

  const saveCurrentAsTemplate = async () => {
    if (!body.trim()) return;
    setSavingTemplate(true);
    setTemplateHint("");
    try {
      const saved = await smsSendService.saveTemplate(templateName.trim() || body.trim().slice(0, 40), body.trim());
      setTemplates((prev) => [saved, ...prev.filter((item) => item.id !== saved.id)]);
      setTemplateId(saved.id);
      setTemplateName("");
      setTemplateHint("Şablon kaydedildi.");
    } catch (err) {
      setTemplateHint(err instanceof Error ? err.message : "Şablon kaydedilemedi");
    } finally {
      setSavingTemplate(false);
    }
  };

  const submit = async () => {
    if (!originatorId || !body.trim() || !basket.length || creditShort) return;
    setSaving(true);
    setError("");
    try {
      const created = await smsSendService.create({
        idempotencyKey: key,
        name: campaignName.trim(),
        category,
        composition: kind,
        originatorId,
        body: body.trim(),
        mode: kind === "SCHEDULED" ? "SCHEDULE" : "DRAFT",
        scheduledAt: kind === "SCHEDULED" ? scheduledAt : undefined,
        sources: basket.map((item) => ({
          type: item.type,
          label: item.label,
          groupId: item.groupId,
          contactIds: item.contactIds,
          excludedContactIds: item.excludedContactIds,
          phones: item.phones,
        })),
      });
      const fileItem = basket.find((item) => item.file);
      if (fileItem?.file) {
        await smsSendService.uploadFile(created.id, fileItem.file);
      }
      router.push(`/customer/sms/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kampanya oluşturulamadı");
    } finally {
      setSaving(false);
    }
  };

  const canLeaveStep1 = Boolean(originatorId && campaignName.trim() && category && (kind !== "SCHEDULED" || scheduledAt));
  const singlePhone = parseGsmNumbers(manual).valid;
  const canLeaveStep2 = kind === "SINGLE" ? singlePhone.length === 1 : basket.length > 0;
  const canLeaveStep3 = Boolean(body.trim());

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Yeni SMS Gönder</h1>
          <p className="mt-1 text-sm text-slate-500">Başlık, kitle ve mesajı adım adım tamamlayın.</p>
        </div>
        <Link href="/customer/sms">
          <Button variant="outline" className="h-9 gap-2 rounded-xl px-4">
            <ArrowLeft className="h-4 w-4" />
            Geri
          </Button>
        </Link>
      </div>

      <ol className="mb-8 flex items-center">
        {STEPS.map((item, index) => {
          const done = step > item.id;
          const active = step === item.id;
          return (
            <li key={item.id} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    done
                      ? "bg-blue-600 text-white"
                      : active
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {done ? <Check className="h-5 w-5" /> : item.id}
                </span>
                <span className={`mt-2 text-xs font-medium ${active || done ? "text-slate-800" : "text-slate-400"}`}>
                  {item.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`mx-3 mb-6 h-px flex-1 ${step > item.id ? "bg-blue-600" : "bg-slate-200"}`} />
              )}
            </li>
          );
        })}
      </ol>

      {loadError && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Gönderim Türü</h2>
              <p className="mt-1 text-sm text-slate-500">İhtiyacınıza uygun seçeneği belirleyin.</p>
              <div className="mt-4 space-y-2">
                {SEND_KINDS.map((item) => {
                  const selected = kind === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setKind(item.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left ${
                        selected ? "border-blue-500 bg-blue-50/60" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? "border-blue-600" : "border-slate-300"}`}>
                        {selected ? <span className="h-2 w-2 rounded-full bg-blue-600" /> : null}
                      </span>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                        <span className="block text-xs text-slate-500">{item.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <p>
                  <span className="font-medium text-slate-800">{SEND_KINDS.find((item) => item.id === kind)?.title}. </span>
                  {SEND_KINDS.find((item) => item.id === kind)?.detail}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Kampanya Bilgileri</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-slate-700">Kampanya adı</Label>
                  <input
                    className={selectClass}
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    maxLength={120}
                    placeholder="Yeni Ürün Duyurusu"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-slate-700">Kategori</Label>
                  <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CAMPAIGN_CATEGORIES.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-sm font-medium text-slate-700">SMS başlığı (Originatör)</Label>
                  <select className={selectClass} value={originatorId} onChange={(e) => setOriginatorId(e.target.value)}>
                    <option value="">Başlık seçin</option>
                    {originators.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  {originators.length === 0 && !loadError && (
                    <p className="mt-2 text-xs text-amber-700">Aktif originatör bulunamadı. Önce başlık tanımlayın.</p>
                  )}
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                    Gönderici başlığı alıcılara bu şekilde görünecektir.
                  </p>
                </div>
                {kind === "SCHEDULED" && (
                  <div>
                    <Label className="mb-1.5 block text-sm font-medium text-slate-700">Gönderim zamanı</Label>
                    <input
                      type="datetime-local"
                      className={selectClass}
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </section>
          </div>
          <div className="flex justify-end">
            <Button className="h-10 rounded-xl bg-blue-600 px-6 text-white hover:bg-blue-700" disabled={!canLeaveStep1} onClick={() => setStep(2)}>
              Devam
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">{kind === "SINGLE" ? "Tek numara" : "Alıcı Seçimi"}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {kind === "SINGLE"
              ? "Mesajın gideceği tek GSM numarasını yazın."
              : "Gönderim yapacağınız kişileri seçin veya yükleyin."}
          </p>

          {kind === "SINGLE" ? (
            <div className="mt-5 max-w-md">
              <Label className="mb-1.5 block text-sm font-medium text-slate-700">Telefon numarası</Label>
              <input
                className={selectClass}
                value={manual}
                onChange={(e) => setManual(onlyPhoneChars(e.target.value))}
                placeholder="0533 700 01 44"
                inputMode="numeric"
              />
              {manual.trim() && singlePhone.length !== 1 && (
                <p className="mt-2 text-xs text-amber-700">Geçerli bir GSM numarası yazın. Uygun olmayan numara eklenmez.</p>
              )}
            </div>
          ) : (
          <div className="mt-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { id: "groups", label: "Rehber ve Gruplar", icon: Users },
                    { id: "manual", label: "Manuel Numaralar", icon: FileSpreadsheet },
                    { id: "file", label: "Excel / CSV", icon: Upload },
                    { id: "people", label: "Kişi Seç", icon: User },
                  ] as const
                ).map((tab) => {
                  const active = audienceTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAudienceTab(tab.id)}
                      className={`inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium ${
                        active ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={clearAudience}
                className="mb-2 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                <Trash2 className="h-4 w-4" />
                Alıcıları Temizle
              </button>
            </div>

            {audienceTab === "groups" && (
              <div className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="mb-2 text-sm font-medium text-slate-800">Grup seçin</p>
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      className={`${selectClass} pl-9`}
                      value={groupQuery}
                      onChange={(e) => setGroupQuery(e.target.value)}
                      placeholder="Grup ara..."
                    />
                  </label>
                </div>
                <div className="divide-y divide-slate-100">
                  <GroupRow
                    selected={basket.some((item) => item.type === "CONTACT_BOOK")}
                    name="Tüm rehber"
                    detail="Kayıtlı tüm kişiler"
                    count={null}
                    tone="bg-blue-50 text-blue-600"
                    icon={<BookUser className="h-4 w-4" />}
                    onToggle={toggleBook}
                    onView={() => {
                      setGroupId("");
                      setAudienceTab("people");
                      void contactsService.list({ limit: 100 }).then((res) => {
                        setPickContacts(res.items ?? []);
                        setPicked([]);
                        setPickOpen(true);
                      });
                    }}
                  />
                  {groups
                    .filter((item) => {
                      const q = groupQuery.trim().toLocaleLowerCase("tr-TR");
                      if (!q) return true;
                      return `${item.name} ${item.description || ""}`.toLocaleLowerCase("tr-TR").includes(q);
                    })
                    .map((item, index) => (
                      <GroupRow
                        key={item.id}
                        selected={basket.some((row) => row.type === "CONTACT_GROUP" && row.groupId === item.id)}
                        name={item.name}
                        detail={item.description || "Grup"}
                        count={item.memberCount}
                        tone={GROUP_TONES[index % GROUP_TONES.length]}
                        icon={<Users className="h-4 w-4" />}
                        onToggle={() => toggleGroup(item.id)}
                        onView={() => {
                          setAudienceTab("people");
                          void openPick(item.id);
                        }}
                      />
                    ))}
                  {groups.length === 0 && (
                    <p className="px-4 py-8 text-center text-sm text-slate-500">Henüz grup yok. Manuel numara veya Excel kullanabilirsiniz.</p>
                  )}
                </div>
              </div>
            )}

            {audienceTab === "manual" && (
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="mb-3 text-sm font-medium text-slate-800">Manuel numaralar</p>
                <Textarea
                  value={manual}
                  onChange={(e) => setManual(onlyPhoneChars(e.target.value))}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData("text");
                    setManual(onlyPhoneChars(`${manual}${text}`));
                  }}
                  rows={10}
                  inputMode="numeric"
                  autoComplete="off"
                  spellCheck={false}
                  className="h-60 min-h-60 max-h-60 resize-none overflow-y-auto [field-sizing:fixed]"
                  placeholder={"Her satıra bir numara yazın\n0532 000 00 00\n0543 000 00 00"}
                />
                <Button type="button" variant="outline" className="mt-3 rounded-xl" onClick={addManual}>Listeye ekle</Button>
              </div>
            )}

            {audienceTab === "file" && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                <p className="mb-1 text-sm font-medium text-slate-800">Excel / CSV</p>
                <p className="mb-4 text-xs text-slate-500">İlk satırda Telefon sütunu olan .xlsx, .csv veya .txt dosyası yükleyin.</p>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 hover:border-blue-300">
                  <Upload className="h-5 w-5 text-blue-600" />
                  <span>{file ? file.name : "Dosya seçin veya sürükleyin"}</span>
                  <input type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label>
                <Button type="button" className="mt-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700" onClick={() => void addFile()} disabled={!file}>
                  Dosyayı ekle
                </Button>
              </div>
            )}

            {audienceTab === "people" && (
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-3 flex flex-wrap items-end gap-3">
                  <div className="min-w-[220px] flex-1">
                    <p className="mb-1.5 text-sm font-medium text-slate-800">Grup</p>
                    <select
                      className={selectClass}
                      value={groupId}
                      onChange={(e) => {
                        const value = e.target.value;
                        setGroupId(value);
                        if (value) void openPick(value);
                        else setPickOpen(false);
                      }}
                    >
                      <option value="">Grup seçin</option>
                      {groups.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {pickOpen ? (
                  <div className="max-h-80 space-y-1 overflow-auto">
                    {pickContacts.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Bu grupta kişi yok.</p>}
                    {pickContacts.map((item) => {
                      const reason = classifyPhone(item.normalizedPhone || item.mobilePhone, item.status);
                      return (
                        <label key={item.id} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={picked.includes(item.id)}
                            onChange={(e) => {
                              setPicked((prev) => (e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id)));
                            }}
                          />
                          <span className={reason ? "text-amber-800" : "text-slate-800"}>
                            <span className="font-medium">{item.firstName} {item.lastName}</span>
                            <span className="ml-2 text-slate-500">{item.formattedPhone}</span>
                            {reason === "BLACKLIST" ? " · Yasaklı" : reason === "SMS_BLOCKED" ? " · SMS gönderilmeyecek" : ""}
                          </span>
                        </label>
                      );
                    })}
                    <Button className="mt-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700" type="button" onClick={addPicked} disabled={!picked.length}>
                      Seçilenleri ekle
                    </Button>
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-slate-500">Kişileri görmek için bir grup seçin.</p>
                )}
              </div>
            )}

            {basket.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {basket.map((item) => (
                  <span key={item.key} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-slate-400">{item.rawCount}</span>
                    <button type="button" className="text-slate-400 hover:text-red-500" onClick={() => setBasket((prev) => prev.filter((row) => row.key !== item.key))}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Ham alıcı (tahmini): {rawCount}. Gerçek gönderilebilir sayı hazırlıktan sonra hesaplanır.
            </p>
            {restrictHint && (
              <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{restrictHint}</p>
            )}
          </div>
          )}

          <div className="mt-6 flex justify-between">
            <Button variant="outline" className="h-10 rounded-xl px-5" onClick={() => setStep(1)}>Geri</Button>
            <Button
              className="h-10 rounded-xl bg-blue-600 px-6 text-white hover:bg-blue-700"
              disabled={!canLeaveStep2}
              onClick={() => {
                if (kind === "SINGLE") {
                  const phones = parseGsmNumbers(manual).valid;
                  if (phones.length !== 1) return;
                  setBasket([{ key: "single", type: "MANUAL", label: "Tekil numara", phones, rawCount: 1 }]);
                }
                setStep(3);
              }}
            >
              Devam
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Mesaj İçeriği</h2>
            {kind === "PERSONALIZED" && (
              <p className="mt-2 rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-800">
                Kişiselleştirilmiş gönderimde {"{ad}"}, {"{firma}"} gibi değişkenler her alıcı için ayrı doldurulur.
              </p>
            )}
            <div className="mt-5 space-y-4">
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-slate-700">Mesaj Şablonu</Label>
                <select
                  className={selectClass}
                  value={templateId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTemplateId(value);
                    const tpl = templates.find((item) => item.id === value);
                    if (tpl) setBody(tpl.body);
                  }}
                >
                  <option value="">Şablon seçin</option>
                  {templates.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
                <Link href="/customer/sms/templates" className="mt-1.5 inline-block text-xs text-blue-600 hover:underline">
                  Şablonları yönet
                </Link>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm font-medium text-slate-700">Mesaj Metni</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  className="min-h-40 rounded-xl"
                  placeholder="Sayın {yetkili}, {firma} için bilgilendirme..."
                />
                <p className="mt-1.5 text-right text-xs text-slate-500">Karakter: {body.length}</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Kullanılabilir Değişkenler:</p>
                <div className="flex flex-wrap gap-2">
                  {VARIABLES.map((item) => (
                    <button
                      key={item.token}
                      type="button"
                      onClick={() => insertToken(item.token)}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-700 hover:bg-slate-200"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-sm font-medium text-slate-700">Bu mesajı şablon olarak kaydet</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className={selectClass}
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Şablon adı"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0 rounded-xl"
                    disabled={!body.trim() || savingTemplate}
                    onClick={() => void saveCurrentAsTemplate()}
                  >
                    {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                    Kaydet
                  </Button>
                </div>
                {templateHint && <p className="mt-2 text-xs text-slate-600">{templateHint}</p>}
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <Button variant="outline" className="h-10 rounded-xl px-5" onClick={() => setStep(2)}>Geri</Button>
              <Button className="h-10 rounded-xl bg-blue-600 px-6 text-white hover:bg-blue-700" disabled={!canLeaveStep3} onClick={() => setStep(4)}>Devam</Button>
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">SMS Önizleme</h2>
            <PhonePreview text={previewBody || "Mesajınız burada görünecek."} />
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
              <PreviewStat label="Karakter" value={previewBody.length || body.length} />
              <PreviewStat label="SMS Adedi" value={previewProgress.parts || parts} />
              <PreviewStat label="Encoding" value={progress.encoding === "UCS2" ? "Unicode" : "GSM-7"} />
            </div>
          </aside>
        </div>
      )}

      {step === 4 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Gönderim özeti</h2>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <dl className="space-y-3 text-sm">
              <SummaryRow label="Kampanya" value={campaignName || "—"} />
              <SummaryRow label="Kategori" value={CAMPAIGN_CATEGORIES.find((item) => item.value === category)?.label || "—"} />
              <SummaryRow label="Gönderim türü" value={SEND_KINDS.find((item) => item.id === kind)?.title || "—"} />
              <SummaryRow label="Originatör" value={originators.find((item) => item.id === originatorId)?.name || "—"} />
              <SummaryRow label="Zamanlama" value={kind === "SCHEDULED" ? (scheduledAt || "Planlı") : "Onay sonrası hemen"} />
              <SummaryRow label="Ham alıcı (tahmini)" value={String(rawCount)} />
              <SummaryRow label="SMS parça" value={String(parts)} />
              <SummaryRow label="SMS bakiyesi" value={smsBalance == null ? "…" : String(smsBalance)} />
              <SummaryRow label="Tahmini kullanım" value={`${rawCount} × ${parts} = ${estimatedUnits}`} />
            </dl>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Alıcı kaynakları</p>
              <div className="space-y-2">
                {basket.map((item) => (
                  <p key={item.key} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {item.label} · {item.rawCount || "dosya/rehber"}
                  </p>
                ))}
              </div>
              {creditShort && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                  {estimatedUnits} SMS için {estimatedUnits} kredi gerekir. Bakiyeniz {smsBalance}. Gönderim yapılmaz.
                </p>
              )}
              {shownRestricted.total > 0 && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                  <p className="font-medium">
                    {shownRestricted.blacklist.length ? `${shownRestricted.blacklist.length} yasaklı` : null}
                    {shownRestricted.blacklist.length && shownRestricted.smsBlocked.length ? " ve " : null}
                    {shownRestricted.smsBlocked.length ? `${shownRestricted.smsBlocked.length} SMS gönderilmeyecek` : null}
                    {" "}numara nihai listeden çıkarılacak.
                  </p>
                  {shownRestricted.blacklist.length > 0 && (
                    <p className="mt-1 text-xs">Yasaklı: {shownRestricted.blacklist.slice(0, 8).join(" · ")}{shownRestricted.blacklist.length > 8 ? " · …" : ""}</p>
                  )}
                  {shownRestricted.smsBlocked.length > 0 && (
                    <p className="mt-1 text-xs">SMS gönderilmeyecek: {shownRestricted.smsBlocked.slice(0, 8).join(" · ")}{shownRestricted.smsBlocked.length > 8 ? " · …" : ""}</p>
                  )}
                </div>
              )}
              <p className="mt-3 text-xs text-slate-500">
                Grup, rehber ve Excel içindeki yasaklı / SMS gönderilmeyecek numaralar hazırlık sonrası kampanya özetinde de düşülür.
              </p>
            </div>
          </div>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          <div className="mt-6 flex justify-between">
            <Button variant="outline" className="h-10 rounded-xl px-5" onClick={() => setStep(3)}>Geri</Button>
            <Button className="h-10 rounded-xl bg-blue-600 px-6 text-white hover:bg-blue-700" disabled={saving || creditShort} onClick={() => void submit()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kampanyayı oluştur"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function phoneHint(blocked: string[], rejected: string[]) {
  const notes: string[] = [];
  if (blocked.length) {
    notes.push(`${blocked.join(", ")} yasaklı / SMS gönderilmeyecek listesinde. SMS gitmez, sepete eklenmedi.`);
  }
  if (rejected.length) {
    const sample = rejected.slice(0, 8).join(", ");
    notes.push(`${sample}${rejected.length > 8 ? "…" : ""} geçerli GSM numarası değil, sepete eklenmedi.`);
  }
  return notes.join(" ");
}

function onlyPhoneChars(value: string) {
  return value.replace(/[^\d+\n,;\s]/g, "");
}

function uniquePhones(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.replace(/\D/g, "") || value;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function uniqueIds(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function phonesFromRestrictions(items: { mobilePhone?: string; formattedPhone?: string }[]) {
  const set = new Set<string>();
  for (const item of items) {
    const normalized = normalizeTrMobile(item.mobilePhone) || normalizeTrMobile(item.formattedPhone);
    if (normalized) set.add(normalized);
  }
  return set;
}

function PhonePreview({ text }: { text: string }) {
  return (
    <div className="mx-auto w-[230px]">
      <div className="rounded-[2.2rem] border-[10px] border-slate-800 bg-slate-800 shadow-xl">
        <div className="relative min-h-[390px] overflow-hidden rounded-[1.6rem] bg-[#ece5dd] px-3 pb-5 pt-8">
          <div className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-800" />
          <div className="mt-4 max-w-[90%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-[13px] leading-5 text-slate-800 shadow-sm whitespace-pre-wrap">
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

const GROUP_TONES = ["bg-emerald-50 text-emerald-600", "bg-violet-50 text-violet-600", "bg-orange-50 text-orange-600", "bg-sky-50 text-sky-600"];

function GroupRow({
  selected,
  name,
  detail,
  count,
  tone,
  icon,
  onToggle,
  onView,
}: {
  selected: boolean;
  name: string;
  detail: string;
  count: number | null;
  tone: string;
  icon: ReactNode;
  onToggle: () => void;
  onView: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
          selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
        }`}
        aria-pressed={selected}
      >
        {selected ? <Check className="h-3.5 w-3.5" /> : null}
      </button>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
        <p className="truncate text-xs text-slate-500">{detail}</p>
      </div>
      {count != null && (
        <p className="shrink-0 text-sm text-slate-500">{new Intl.NumberFormat("tr-TR").format(count)} kişi</p>
      )}
      <button type="button" onClick={onView} className="shrink-0 text-sm font-medium text-blue-600 hover:underline">
        Kişileri gör
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function readSmsRepeat() {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("sms-repeat");
  if (!raw) return null;
  sessionStorage.removeItem("sms-repeat");
  try {
    const parsed = JSON.parse(raw) as { originatorId?: string; body?: string; phones?: string[] };
    return parsed;
  } catch {
    return null;
  }
}
