"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, UserPlus } from "lucide-react";
import { WizardContact, CONTACT_TYPE_LABELS, ContactType } from "../types";

const emptyContact: WizardContact = {
  name: "",
  contactType: "MANAGER",
  phone: "",
  mobile: "",
  email: "",
};

interface StepContactsProps {
  contacts: WizardContact[];
  onChange: (contacts: WizardContact[]) => void;
}

export function StepContacts({ contacts, onChange }: StepContactsProps) {
  const addContact = () => {
    onChange([...contacts, { ...emptyContact }]);
  };

  const updateContact = (index: number, patch: Partial<WizardContact>) => {
    const updated = contacts.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onChange(updated);
  };

  const removeContact = (index: number) => {
    onChange(contacts.filter((_, i) => i !== index));
  };

  const isEmailValid = (email: string) => {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-700">Yetkili Kişiler</h3>
          <p className="text-sm text-slate-500">Firma ile ilgili iletişim kurulacak kişileri ekleyin.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addContact}>
          <UserPlus className="mr-1 h-4 w-4" />
          Kişi Ekle
        </Button>
      </div>

      {contacts.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-500">Henüz yetkili kişi eklenmedi.</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={addContact}>
            <UserPlus className="mr-1 h-4 w-4" />
            İlk Kişiyi Ekle
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {contacts.map((contact, index) => (
            <div key={index} className="rounded-lg border border-slate-200 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">Kişi {index + 1}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeContact(index)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ad Soyad *</Label>
                  <Input
                    value={contact.name}
                    onChange={(e) => updateContact(index, { name: e.target.value })}
                    placeholder="Ad soyad"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Görev</Label>
                  <select
                    value={contact.contactType}
                    onChange={(e) => updateContact(index, { contactType: e.target.value as ContactType })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Telefon</Label>
                  <Input
                    value={contact.phone}
                    onChange={(e) => updateContact(index, { phone: e.target.value.replace(/[^\d\s\-\+\(\)]/g, "") })}
                    placeholder="0212 xxx xx xx"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cep Telefonu</Label>
                  <Input
                    value={contact.mobile}
                    onChange={(e) => updateContact(index, { mobile: e.target.value.replace(/[^\d\s\-\+\(\)]/g, "") })}
                    placeholder="05xx xxx xx xx"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>E-posta</Label>
                  <Input
                    type="email"
                    value={contact.email}
                    onChange={(e) => updateContact(index, { email: e.target.value })}
                    placeholder="kisi@firma.com"
                    className={contact.email && !isEmailValid(contact.email) ? "border-red-300" : ""}
                  />
                  {contact.email && !isEmailValid(contact.email) && (
                    <p className="text-xs text-red-500">Geçerli bir e-posta adresi girin</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
