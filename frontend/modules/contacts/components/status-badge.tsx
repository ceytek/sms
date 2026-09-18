"use client";

import { Badge } from "@/components/ui/badge";
import type { ContactStatus } from "../types";
import { CONTACT_STATUS_LABELS } from "../types";

const styles: Record<ContactStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PASSIVE: "bg-slate-100 text-slate-600 border-slate-200",
  BLACKLIST: "bg-red-50 text-red-700 border-red-200",
  SMS_BLOCKED: "bg-amber-50 text-amber-700 border-amber-200",
};

export function ContactStatusBadge({ status }: { status: ContactStatus }) {
  return (
    <Badge variant="outline" className={styles[status]}>
      {CONTACT_STATUS_LABELS[status]}
    </Badge>
  );
}
