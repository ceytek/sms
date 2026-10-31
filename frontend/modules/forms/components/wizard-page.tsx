"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, GripVertical, Plus, Trash2, Check, Send } from "lucide-react";
import { parseGsmNumbers } from "@/lib/phone";
import { contactGroupsService } from "@/modules/contacts/services/groups.service";
import { smsSendService } from "@/modules/messaging/services/sms-send.service";
import { formService } from "../services/form.service";
import { FIELD_TYPE_LABELS, type FormField, type FormFieldType, type FormRecord, type FormSource } from "../types";

const STEPS = ["Genel Bilgiler", "Alanlar", "Form Ayarları", "Dağıtım", "Önizleme", "Yayınla"];
const FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as FormFieldType[];

export function FormWizardPage({ id }: { id?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(Number(searchParams.get("step")) || 0);
  const [form, setForm] = useState<Partial<FormRecord & { fields: FormField[] }>>({
    name: "", title: "", description: "", personalized: false, singleSubmission: false, allowEdit: false,
    thankYouMessage: "Teşekkür ederiz. Bilgileriniz başarıyla kaydedildi.", smsBody: "{form_link}",
    fields: [],
  });
  const [sources, setSources] = useState<FormSource[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (id) {
      formService.get(id).then((data) => {
        setForm(data);
        setSources(data.audience?.sources ?? []);
      }).catch((e) => setError(e instanceof Error ? e.message : "Yüklenemedi"));
    }
  }, [id]);

  const save = useCallback(async (patch: Partial<FormRecord>, next?: number) => {
    setSaving(true); setError("");
    try {
      if (!form.id) {
        const created = await formService.create({
          name: patch.name,
          title: patch.title,
          description: patch.description,
          personalized: form.personalized,
          singleSubmission: form.singleSubmission,
          allowEdit: form.allowEdit,
          thankYouMessage: form.thankYouMessage,
          smsBody: form.smsBody,
        });
        setForm(created);
        router.replace(`/customer/forms/${created.id}?step=${next ?? step}`);
      } else {
        const updated = await formService.update(form.id, patch);
        setForm(updated);
      }
      if (next !== undefined) setStep(next);
    } catch (e) { setError(e instanceof Error ? e.message : "Kayıt hatası"); }
    setSaving(false);
  }, [form, step, router]);

  const saveFields = useCallback(async (next?: number) => {
    if (!form.id) return;
    setSaving(true); setError("");
    try {
      const updated = await formService.saveFields(form.id, form.fields ?? []);
      setForm(updated);
      if (next !== undefined) setStep(next);
    } catch (e) { setError(e instanceof Error ? e.message : "Kayıt hatası"); }
    setSaving(false);
  }, [form]);

  const publish = useCallback(async (send: boolean) => {
    if (!form.id) return;
    if (send) {
      if (!form.originatorId) { setError("SMS başlığı seçin. Dağıtım adımından başlık seçin."); return; }
      if (!sources.length) { setError("Alıcı seçin. Dağıtım adımından grup veya numara ekleyin."); return; }
      if (!form.smsBody?.trim()) { setError("SMS metnini yazın."); return; }
    }
    setSaving(true); setError(""); setNotice("");
    try {
      if (send) {
        await formService.update(form.id, { smsBody: form.smsBody, originatorId: form.originatorId, audience: { sources } });
      }
      const updated = await formService.publish(form.id);
      setForm((current) => ({ ...current, ...updated }));
      if (send) {
        const result = await formService.distribute(form.id, {
          originatorId: form.originatorId || "",
          body: form.smsBody || "{form_link}",
          sources,
        });
        setSent(true);
        setNotice(`${result.validRecipientCount.toLocaleString("tr-TR")} kişiye SMS kuyruğa alındı.`);
      } else {
        setNotice("Form yayınlandı. İstersen şimdi SMS ile gönderebilirsin.");
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Yayınlama hatası"); }
    setSaving(false);
  }, [form, sources]);

  const goNext = () => {
    if (step === 0) save({ name: form.name, title: form.title, description: form.description }, step + 1);
    else if (step === 1) saveFields(step + 1);
    else if (step === 2) save({ personalized: form.personalized, singleSubmission: form.singleSubmission, allowEdit: form.allowEdit, startsAt: form.startsAt || undefined, endsAt: form.endsAt || undefined, maxSubmissions: form.maxSubmissions || undefined, thankYouMessage: form.thankYouMessage }, step + 1);
    else if (step === 3) save({ smsBody: form.smsBody, ...(form.originatorId ? { originatorId: form.originatorId } : {}), audience: { sources } }, step + 1);
    else if (step === 4) setStep(5);
  };
  const goPrev = () => setStep(Math.max(0, step - 1));
  const onForm = (patch: Partial<FormRecord & { fields: FormField[] }>) => setForm((p) => ({ ...p, ...patch }));
  const fields = form.fields ?? [];

  const addField = (type: FormFieldType) => {
    onForm({ fields: [...fields, { type, label: FIELD_TYPE_LABELS[type], required: false, position: fields.length, options: type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE" || type === "DROPDOWN" ? [{ label: "Seçenek 1", position: 0 }] : type === "YES_NO" ? [{ label: "Evet", position: 0 }, { label: "Hayır", position: 1 }] : undefined }] });
  };
  const updateField = (index: number, patch: Partial<FormField>) => {
    const next = [...fields]; next[index] = { ...next[index], ...patch }; onForm({ fields: next });
  };
  const removeField = (index: number) => { const next = [...fields]; next.splice(index, 1); onForm({ fields: next.map((f, i) => ({ ...f, position: i })) }); };
  const moveField = (from: number, to: number) => {
    if (to < 0 || to >= fields.length) return;
    const next = [...fields]; const [item] = next.splice(from, 1); next.splice(to, 0, item);
    onForm({ fields: next.map((f, i) => ({ ...f, position: i })) });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/customer/forms/list")} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><ChevronLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-bold text-slate-900">{form.id ? form.name || "Form" : "Yeni Form"}</h1>
      </div>
      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}

      {/* Stepper */}
      <div className="flex gap-1 overflow-x-auto">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => form.id ? setStep(i) : undefined} className={`flex-shrink-0 rounded-lg px-3 py-2 text-xs font-medium ${i === step ? "bg-blue-600 text-white" : i < step ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border bg-white p-5 space-y-5">
        {step === 0 && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Form Adı *</label>
              <input value={form.name ?? ""} onChange={(e) => onForm({ name: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Bayi Başvuru Formu" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Form Başlığı</label>
              <input value={form.title ?? ""} onChange={(e) => onForm({ title: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Bayimiz Olmak İster Misiniz?" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Açıklama</label>
              <textarea value={form.description ?? ""} onChange={(e) => onForm({ description: e.target.value })} rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Lütfen bilgilerinizi doldurun." />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {FIELD_TYPES.map((t) => (
                <button key={t} onClick={() => addField(t)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200">
                  + {FIELD_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {fields.map((f, i) => (
                <div key={f.id || i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveField(i, i - 1)} disabled={i === 0} className="text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5 rotate-90" /></button>
                      <button onClick={() => moveField(i, i + 1)} disabled={i === fields.length - 1} className="text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5 -rotate-90" /></button>
                    </div>
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">{FIELD_TYPE_LABELS[f.type as FormFieldType] ?? f.type}</span>
                    <input value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} className="flex-1 rounded-lg border px-2 py-1.5 text-sm" placeholder="Alan adı" />
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      <input type="checkbox" checked={f.required} onChange={(e) => updateField(i, { required: e.target.checked })} className="rounded" /> Zorunlu
                    </label>
                    <button onClick={() => removeField(i)} className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={f.placeholder ?? ""} onChange={(e) => updateField(i, { placeholder: e.target.value })} className="rounded-lg border px-2 py-1.5 text-xs" placeholder="Placeholder" />
                    <input value={f.description ?? ""} onChange={(e) => updateField(i, { description: e.target.value })} className="rounded-lg border px-2 py-1.5 text-xs" placeholder="Açıklama" />
                  </div>
                  {(f.type === "SINGLE_CHOICE" || f.type === "MULTIPLE_CHOICE" || f.type === "DROPDOWN" || f.type === "YES_NO") && (
                    <div className="space-y-1.5 pl-6">
                      {(f.options ?? []).map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <input value={opt.label} onChange={(e) => { const opts = [...(f.options ?? [])]; opts[oi] = { ...opts[oi], label: e.target.value }; updateField(i, { options: opts }); }} className="rounded border px-2 py-1 text-xs flex-1" />
                          <button onClick={() => { const opts = (f.options ?? []).filter((_, j) => j !== oi); updateField(i, { options: opts }); }} className="text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      ))}
                      <button onClick={() => updateField(i, { options: [...(f.options ?? []), { label: `Seçenek ${(f.options?.length ?? 0) + 1}`, position: f.options?.length ?? 0 }] })} className="text-xs text-blue-600 hover:underline">+ Seçenek ekle</button>
                    </div>
                  )}
                </div>
              ))}
              {!fields.length && <p className="text-center text-sm text-slate-400 py-8">Henüz alan eklenmemiş. Yukarıdan alan tipi seçin.</p>}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <input type="checkbox" checked={form.personalized ?? false} onChange={(e) => onForm({ personalized: e.target.checked })} className="rounded" />
                <div><p className="font-medium">Kişisel Form</p><p className="text-xs text-slate-500">Her alıcıya özel bağlantı</p></div>
              </label>
              <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <input type="checkbox" checked={form.singleSubmission ?? false} onChange={(e) => onForm({ singleSubmission: e.target.checked })} className="rounded" />
                <div><p className="font-medium">Tek Başvuru</p><p className="text-xs text-slate-500">Aynı kişi bir kez doldurabilir</p></div>
              </label>
              <label className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                <input type="checkbox" checked={form.allowEdit ?? false} onChange={(e) => onForm({ allowEdit: e.target.checked })} className="rounded" />
                <div><p className="font-medium">Düzenleme İzni</p><p className="text-xs text-slate-500">Gönderilen form düzenlenebilir</p></div>
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Başlangıç Tarihi</label>
                <input type="datetime-local" value={toLocalInput(form.startsAt)} onChange={(e) => onForm({ startsAt: e.target.value ? new Date(e.target.value).toISOString() : null })} className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Bitiş Tarihi</label>
                <input type="datetime-local" value={toLocalInput(form.endsAt)} onChange={(e) => onForm({ endsAt: e.target.value ? new Date(e.target.value).toISOString() : null })} className="w-full rounded-lg border px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Maksimum Başvuru</label>
              <input type="number" value={form.maxSubmissions ?? ""} onChange={(e) => onForm({ maxSubmissions: e.target.value ? Number(e.target.value) : null })} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Sınırsız" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Teşekkür Mesajı</label>
              <textarea value={form.thankYouMessage ?? ""} onChange={(e) => onForm({ thankYouMessage: e.target.value })} rows={2} className="w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
          </>
        )}

        {step === 3 && (
          <DistributionStep
            smsBody={form.smsBody ?? ""}
            originatorId={form.originatorId ?? ""}
            sources={sources}
            onSmsBody={(smsBody) => onForm({ smsBody })}
            onOriginator={(originatorId) => onForm({ originatorId })}
            onSources={setSources}
          />
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">{form.title || form.name}</h3>
            {form.description && <p className="text-sm text-slate-600">{form.description}</p>}
            <div className="space-y-3">
              {fields.map((f, i) => (
                <div key={f.id || i} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm font-medium text-slate-800">{f.label} {f.required && <span className="text-red-500">*</span>}</p>
                  {f.description && <p className="text-xs text-slate-500">{f.description}</p>}
                  {f.type === "HEADING" ? null : f.type === "LONG_TEXT" || f.type === "ADDRESS" ? (
                    <div className="mt-1 h-16 rounded border bg-white" />
                  ) : f.type === "CHECKBOX" ? (
                    <div className="mt-1 flex items-center gap-2"><input type="checkbox" disabled className="rounded" /><span className="text-xs text-slate-400">{f.label}</span></div>
                  ) : (f.options?.length ?? 0) > 0 ? (
                    <div className="mt-1 space-y-1">{f.options!.map((o, oi) => (
                      <div key={oi} className="flex items-center gap-2 text-xs text-slate-600">
                        {f.type === "MULTIPLE_CHOICE" ? <input type="checkbox" disabled className="rounded" /> : <input type="radio" disabled />}
                        {o.label}
                      </div>
                    ))}</div>
                  ) : (
                    <div className="mt-1 h-9 rounded border bg-white" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 text-center py-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <Check className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{form.status === "ACTIVE" ? "Form yayında" : "Formu Yayınla"}</h3>
            <p className="text-sm text-slate-600">Yayınlanan form bağlantıdan başvuru alır. SMS, dağıtım adımında seçtiğin başlık ve alıcılara gider.</p>
            <p className="text-sm"><span className="font-medium">{fields.length}</span> alan · <span className="font-medium">{fields.filter((f) => f.required).length}</span> zorunlu · <span className="font-medium">{sources.length}</span> alıcı kaynağı</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {!sent && form.status !== "ACTIVE" && (
                <button onClick={() => publish(false)} disabled={saving} className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  {saving ? "Yayınlanıyor..." : "Yayınla"}
                </button>
              )}
              {!sent && (
                <button onClick={() => publish(true)} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  <Send className="h-4 w-4" /> {saving ? "Gönderiliyor..." : form.status === "ACTIVE" ? "SMS gönder" : "Yayınla ve SMS gönder"}
                </button>
              )}
              {(sent || form.status === "ACTIVE" || notice) && (
                <button onClick={() => router.push("/customer/forms/list")} className="rounded-lg px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50">Listeye dön</button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {step < 5 && (
        <div className="flex items-center justify-between">
          <button onClick={goPrev} disabled={step === 0} className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" /> Geri
          </button>
          <button onClick={goNext} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Kaydediliyor..." : "İleri"} <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function DistributionStep({
  smsBody,
  originatorId,
  sources,
  onSmsBody,
  onOriginator,
  onSources,
}: {
  smsBody: string;
  originatorId: string;
  sources: FormSource[];
  onSmsBody: (value: string) => void;
  onOriginator: (value: string) => void;
  onSources: (value: FormSource[]) => void;
}) {
  const [originators, setOriginators] = useState<{ id: string; name: string }[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string; memberCount: number }[]>([]);
  const [manual, setManual] = useState("");
  const [groupId, setGroupId] = useState("");

  useEffect(() => {
    smsSendService.originators().then((rows) => setOriginators(rows.items ?? [])).catch(() => setOriginators([]));
    contactGroupsService.list().then((rows) => setGroups(rows.map((row) => ({ id: row.id, name: row.name, memberCount: row.memberCount })))).catch(() => setGroups([]));
  }, []);

  const addGroup = (id: string) => {
    setGroupId("");
    const group = groups.find((item) => item.id === id);
    if (!group || sources.some((source) => source.type === "CONTACT_GROUP" && source.groupId === group.id)) return;
    onSources([...sources, { type: "CONTACT_GROUP", groupId: group.id, label: group.name }]);
  };

  const addManual = () => {
    const parsed = parseGsmNumbers(manual);
    if (!parsed.valid.length) return;
    onSources([...sources, { type: "MANUAL", label: `Manuel ${parsed.valid.length}`, phones: parsed.valid }]);
    setManual("");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Yayınladıktan sonra bu başlık ve alıcılara SMS gider. {"{form_link}"} her alıcının form bağlantısı olur.</p>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">SMS başlığı</label>
        <select value={originatorId} onChange={(event) => onOriginator(event.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
          <option value="">Başlık seçin</option>
          {originators.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">SMS metni</label>
        <textarea value={smsBody} onChange={(event) => onSmsBody(event.target.value)} rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Formumuzu doldurmak için: {form_link}" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Rehber grubu</label>
          <select value={groupId} onChange={(event) => addGroup(event.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm">
            <option value="">Grup ekle</option>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name} ({group.memberCount.toLocaleString("tr-TR")})</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => { if (!sources.some((source) => source.type === "CONTACT_BOOK")) onSources([...sources, { type: "CONTACT_BOOK", label: "Tüm rehber" }]); }}
            className="h-10 rounded-lg border px-3 text-sm text-slate-700 hover:bg-slate-50"
          >
            Tüm rehberi ekle
          </button>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Manuel numara</label>
        <textarea value={manual} onChange={(event) => setManual(event.target.value)} rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" placeholder={"Her satıra bir numara\n0532 000 00 00"} />
        <button type="button" onClick={addManual} className="mt-2 text-sm text-blue-600 hover:underline">Numaraları ekle</button>
      </div>
      <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        {sources.length ? sources.map((source, index) => (
          <div key={`${source.type}-${source.groupId || index}`} className="flex items-center justify-between gap-2 py-1">
            <span>{source.label || source.type}</span>
            <button type="button" className="text-xs text-red-500" onClick={() => onSources(sources.filter((_, item) => item !== index))}>Kaldır</button>
          </div>
        )) : <p>Henüz alıcı seçilmedi.</p>}
      </div>
    </div>
  );
}
