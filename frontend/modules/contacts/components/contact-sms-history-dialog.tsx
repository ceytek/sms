"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { contactsService, type ContactSmsHistoryItem } from "../services/contacts.service";
import type { ContactRecord } from "../types";
import { recipientStatusLabel } from "@/modules/messaging/sms-status-labels";

export function ContactSmsHistoryDialog({
  contact,
  onClose,
}: {
  contact: ContactRecord;
  onClose: () => void;
}) {
  const [items, setItems] = useState<ContactSmsHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    void contactsService
      .smsHistory(contact.id, page)
      .then((res) => {
        setItems(res.items ?? []);
        setTotal(res.meta?.total ?? 0);
        setTotalPages(res.meta?.totalPages ?? 1);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Geçmiş yüklenemedi"))
      .finally(() => setLoading(false));
  }, [contact.id, page]);

  const title = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.formattedPhone;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Geçmiş mesajlar</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {title} · {contact.formattedPhone}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {!loading && !items.length && !error && (
            <p className="py-10 text-center text-sm text-slate-500">Bu numaraya henüz SMS gönderilmemiş.</p>
          )}
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{item.sentAt ? new Date(item.sentAt).toLocaleString("tr-TR") : "—"}</span>
                  <span>
                    {item.originatorName || "SMS"} · {recipientStatusLabel(item.status)}
                    {item.smsParts > 1 ? ` · ${item.smsParts} parça` : ""}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-800">{item.body || "—"}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3 text-sm text-slate-500">
          <span>Toplam {total} mesaj</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
              Önceki
            </Button>
            <span className="self-center">
              {page} / {totalPages}
            </span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
              Sonraki
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
