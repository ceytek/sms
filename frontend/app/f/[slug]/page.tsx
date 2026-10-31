"use client";
import { use } from "react";
import { PublicFormPage } from "@/modules/forms";
export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <PublicFormPage slug={slug} />;
}
