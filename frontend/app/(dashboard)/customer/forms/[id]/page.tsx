"use client";
import { use } from "react";
import { FormWizardPage } from "@/modules/forms";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <FormWizardPage id={id} />;
}
