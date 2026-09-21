import { Button } from "@/components/ui/button";
import type { OriginatorRecord } from "../types";

export function OriginatorBanDialog({
  item,
  onCancel,
  onConfirm,
}: {
  item: OriginatorRecord | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Başlığı yasakla</h2>
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-mono font-semibold">{item.name}</span> yasaklı listeye eklenecek.
          Bu isimdeki tüm mevcut başlıklar pasife alınacak ve yeniden tanımlanamayacak.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Vazgeç
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Yasakla
          </Button>
        </div>
      </div>
    </div>
  );
}
