"use client";

import { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { SurveyWizardPage } from "@/modules/surveys";

function SurveyWizardRoute() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const raw = Number(search.get("step") ?? "0");
  const initialStep = Number.isInteger(raw) && raw >= 0 && raw < 6 ? raw : 0;
  return <SurveyWizardPage surveyId={params.id} initialStep={initialStep} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <SurveyWizardRoute />
    </Suspense>
  );
}
