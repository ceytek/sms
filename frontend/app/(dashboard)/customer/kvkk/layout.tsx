"use client";

import { KvkkGate } from "@/modules/kvkk/components/kvkk-gate";

export default function KvkkLayout({ children }: { children: React.ReactNode }) {
  return <KvkkGate>{children}</KvkkGate>;
}
