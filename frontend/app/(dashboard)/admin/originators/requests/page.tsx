"use client";

import { OriginatorsAccess, OriginatorRequestsManager } from "@/modules/originators";

export default function OriginatorRequestsPage() {
  return (
    <OriginatorsAccess adminOnly>
      {() => <OriginatorRequestsManager />}
    </OriginatorsAccess>
  );
}
