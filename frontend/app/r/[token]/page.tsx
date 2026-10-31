"use client";

import { useParams } from "next/navigation";
import { PublicSurveyForm } from "@/modules/surveys";

export default function Page() {
  const params = useParams<{ token: string }>();
  return <PublicSurveyForm token={params.token} />;
}