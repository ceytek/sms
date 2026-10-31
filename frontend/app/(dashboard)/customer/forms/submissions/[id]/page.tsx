"use client";
import { use } from "react";
import { FormSubmissionDetailPage } from "@/modules/forms";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <FormSubmissionDetailPage id={id} />;
}
