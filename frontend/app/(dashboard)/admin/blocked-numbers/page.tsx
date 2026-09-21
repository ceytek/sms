"use client";

import { DealerRestrictedContactsRoute } from "@/modules/contacts";

export default function DealerBlockedNumbersPage() {
  return <DealerRestrictedContactsRoute status="BLACKLIST" />;
}
