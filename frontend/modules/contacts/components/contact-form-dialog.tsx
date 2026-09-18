"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contactsService } from "../services/contacts.service";
import type { ContactGroupRecord, ContactRecord, ContactStatus, ContactTagRecord, ContactCustomFieldRecord } from "../types";
import { CONTACT_STATUS_LABELS, selectClass } from "../types";
import { formatTrMobile, normalizeTrMobile } from "@/lib/phone";

const emptyForm = {
  firstName: "",
  lastName: "",
  mobilePhone: "",
  email: "",
  companyName: "",
  notes: "",
  status: "ACTIVE" as ContactStatus,
  groupIds: [] as string[],
  tagIds: [] as string[],
};

export function ContactFormDialog({
  contact,
  groups,
  tags,
  customFields = [],
  onClose,
  onSaved,
}: {
  contact: ContactRecord | null;
  groups: ContactGroupRecord[];
  tags: ContactTagRecord[];
  customFields?: ContactCustomFieldRecord[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const activeFields = customFields.filter((item) => item.isActive || contact?.customFields?.[item.id]);
  const [form, setForm] = useState(() =>
    contact
      ? {
          firstName: contact.firstName,
          lastName: contact.lastName,
          mobilePhone: contact.formattedPhone || contact.mobilePhone,
          email: contact.email,
          companyName: contact.companyName,
          notes: contact.notes,
          status: contact.status,
          groupIds: contact.groups.map((item) => item.id),
          tagIds: contact.tags.map((item) => item.id),
          customFields: { ...(contact.customFields ?? {}) },
        }
      : { ...emptyForm, customFields: {} as Record<string, string> },
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const normalized = normalizeTrMobile(form.mobilePhone);

  const toggle = (key: "groupIds" | "tagIds", id: string) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(id) ? current[key].filter((item) => item !== id) : [...current[key], id],
    }));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        mobilePhone: form.mobilePhone.trim(),
        email: form.email.trim(),
        companyName: form.companyName.trim(),
        notes: form.notes.trim(),
        customFields: Object.fromEntries(activeFields.map((field) => [field.id, (form.customFields[field.id] ?? "").trim()])),
      };
      if (contact) await contactsService.update(contact.id, payload);
      else await contactsService.create(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{contact ? "Kişiyi Düzenle" : "Kişi Ekle"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad"><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Soyad"><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          <Field label="Cep Telefonu *">
            <Input value={form.mobilePhone} onChange={(e) => setForm({ ...form, mobilePhone: e.target.value })} />
            {normalized && <p className="mt-1 text-xs text-slate-500">Kayıt formatı: {formatTrMobile(normalized)}</p>}
          </Field>
          <Field label="E-posta"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Firma"><Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></Field>
          <Field label="Durum">
            <select className={selectClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ContactStatus })}>
              {Object.entries(CONTACT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Açıklama / Not">
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </Field>
          </div>
          {activeFields.map((field) => (
            <Field key={field.id} label={field.name}>
              <CustomFieldInput
                field={field}
                value={form.customFields[field.id] ?? ""}
                onChange={(value) => setForm({ ...form, customFields: { ...form.customFields, [field.id]: value } })}
              />
            </Field>
          ))}
          <ChipPicker label="Gruplar" items={groups} selected={form.groupIds} onToggle={(id) => toggle("groupIds", id)} />
          <ChipPicker label="Etiketler" items={tags} selected={form.tagIds} onToggle={(id) => toggle("tagIds", id)} />
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Vazgeç</Button>
          <Button onClick={() => void save()} disabled={saving || !form.mobilePhone.trim()} className="bg-blue-600 hover:bg-blue-700">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kaydet
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ChipPicker({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: { id: string; name: string; isActive: boolean }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 p-2">
        {items.filter((item) => item.isActive || selected.includes(item.id)).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              selected.includes(item.id) ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {item.name}
          </button>
        ))}
        {!items.length && <span className="text-xs text-slate-400">Henüz yok</span>}
      </div>
    </div>
  );
}

function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: ContactCustomFieldRecord;
  value: string;
  onChange: (value: string) => void;
}) {
  const isoDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (field.fieldType === "DATE" && (isoDate || !value)) {
    return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.fieldType === "NUMBER") {
    return <Input type="number" step="any" value={value} onChange={(e) => onChange(e.target.value)} />;
  }
  return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
}
