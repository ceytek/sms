"use client";

import { DealerRestrictedContactsRoute } from "@/modules/contacts";

export default function DealerSmsBlockedNumbersPage() {
  return <DealerRestrictedContactsRoute status="SMS_BLOCKED" />;
}
