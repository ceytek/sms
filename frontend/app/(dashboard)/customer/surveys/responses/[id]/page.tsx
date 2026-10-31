"use client";

import { useParams } from "next/navigation";
import { SurveyResponseDetailPage } from "@/modules/surveys";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <SurveyResponseDetailPage responseId={params.id} />;
}
