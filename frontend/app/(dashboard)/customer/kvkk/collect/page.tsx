import { Suspense } from "react";
import { KvkkCollectPage } from "@/modules/kvkk";

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-slate-500">Yükleniyor...</p>}>
      <KvkkCollectPage />
    </Suspense>
  );
}
