"use client";

import { useParams } from "next/navigation";
import { KvkkPublicFormPage } from "@/modules/kvkk";

export default function PublicKvkkPage() {
  const params = useParams<{ token: string }>();
  return <KvkkPublicFormPage token={params.token} />;
}
