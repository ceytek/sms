"use client";

import { useParams } from "next/navigation";
import { SurveyResultsPage } from "@/modules/surveys";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <SurveyResultsPage surveyId={params.id} />;
}
