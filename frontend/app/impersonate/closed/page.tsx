"use client";

export default function ImpersonationClosedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Sekme kapatıldı</h1>
        <p className="mt-2 text-sm text-slate-500">
          Bu hesap oturumu sona erdi. Kendi hesabınız diğer sekmede açık kalmaya devam eder.
        </p>
        <p className="mt-4 text-xs text-slate-400">Bu sekmeyi kapatabilirsiniz.</p>
      </div>
    </div>
  );
}
