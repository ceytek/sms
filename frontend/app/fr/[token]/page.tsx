"use client";
import { use } from "react";
import { PublicFormPage } from "@/modules/forms";
export default function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return <PublicFormPage token={token} />;
}
