"use client";

import { useParams } from "next/navigation";
import { SmsCampaignDetailPage } from "@/modules/messaging/components/sms-campaign-detail";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <SmsCampaignDetailPage id={params.id} />;
}
