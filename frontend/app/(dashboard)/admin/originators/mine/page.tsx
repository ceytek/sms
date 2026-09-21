"use client";

import { OriginatorsAccess, MineOriginatorsManager } from "@/modules/originators";

export default function MineOriginatorsPage() {
  return (
    <OriginatorsAccess adminOnly>
      {() => <MineOriginatorsManager />}
    </OriginatorsAccess>
  );
}
