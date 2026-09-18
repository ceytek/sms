"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { kvkkService } from "../services/kvkk.service";
import type { KvkkFormRecord } from "../types";
import { selectClass } from "../types";

type CreatedLink = { formName: string; phone: string; publicUrl: string };

export function KvkkFormLinkPage() {
  const [forms, setForms] = useState<KvkkFormRecord[]>([]);
  const [formId, setFormId] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [links, setLinks] = useState<CreatedLink[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void kvkkService
      .listForms()
      .then((items) => {
        const active = items.filter((item) => item.isActive);
        setForms(active);
        if (active.length === 1) setFormId(active[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Formlar yüklenemedi"));
  }, []);

  const create = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await kvkkService.createFormLink(formId, {
        mobilePhone: phone,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      const form = forms.find((item) => item.id === formId);
      setLinks((current) => [
        { formName: form?.name ?? "Form", phone, publicUrl: result.publicUrl },
        ...current,
      ]);
      setPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Link oluşturulamadı");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="space-y-1.5">
          <Label>Form</Label>
          <select className={selectClass} value={formId} onChange={(e) => setFormId(e.target.value)}>
            <option value="">Seçin</option>
            {forms.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Telefon</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0532..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Ad</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Soyad</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button className="bg-blue-600 hover:bg-blue-700" disabled={busy || !formId || !phone.trim()} onClick={() => void create()}>
          Benzersiz link oluştur
        </Button>
    </div>
      {!!links.length && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Form</th>
                <th className="px-4 py-3 font-medium">Telefon</th>
                <th className="px-4 py-3 font-medium">Link</th>
              </tr>
            </thead>
            <tbody>
              {links.map((item) => (
                <tr key={item.publicUrl} className="border-t border-slate-100">
                  <td className="px-4 py-3">{item.formName}</td>
                  <td className="px-4 py-3">{item.phone}</td>
                  <td className="px-4 py-3">
                    <a className="break-all text-blue-600" href={item.publicUrl} target="_blank" rel="noreferrer">{item.publicUrl}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
