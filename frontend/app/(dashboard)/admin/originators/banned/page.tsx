"use client";

import { OriginatorsAccess, BannedOriginatorsManager } from "@/modules/originators";

export default function BannedOriginatorsPage() {
  return (
    <OriginatorsAccess adminOnly>
      {() => <BannedOriginatorsManager />}
    </OriginatorsAccess>
  );
}
