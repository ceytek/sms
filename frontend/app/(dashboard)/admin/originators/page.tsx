"use client";

import { OriginatorsAccess, OriginatorsManager } from "@/modules/originators";

export default function OriginatorsPage() {
  return <OriginatorsAccess>{(role) => <OriginatorsManager userRole={role} />}</OriginatorsAccess>;
}
