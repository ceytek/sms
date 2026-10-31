"use client";

import { useParams } from "next/navigation";
import { PublicSurveyForm } from "@/modules/surveys";

export default function Page() {
  const params = useParams<{ slug: string }>();
  return <PublicSurveyForm slug={params.slug} />;
}
