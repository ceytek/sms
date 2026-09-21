"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { originatorsService } from "../services/originators.service";
import type { OriginatorRecord } from "../types";
import { OriginatorBanDialog } from "./originator-ban-dialog";

export function OriginatorRequestsManager() {
  const [items, setItems] = useState<OriginatorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmBan, setConfirmBan] = useState<OriginatorRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await originatorsService.listPending();
      setItems(result.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Talepler yüklenemedi");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatus = async (id: string, status: "ACTIVE" | "PASSIVE") => {
    setBusyId(id);
    setError("");
    try {
      await originatorsService.updateStatus(id, status);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Durum güncellenemedi");
    } finally {
      setBusyId(null);
    }
  };

  const handleBanExisting = async () => {
    if (!confirmBan) return;
    setBusyId(confirmBan.id);
    setError("");
    try {
      await originatorsService.banExisting(confirmBan.id);
      setConfirmBan(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yasaklanamadı");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Originatör talepleri</h1>
        <p className="mt-1 text-sm text-slate-500">
          Alt bayilerin müşterileri için açtığı başlıklar burada onaylanır, pasife alınır veya yasaklanır.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-500">Bekleyen originatör talebi yok.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Başlık</TableHead>
                <TableHead>Müşteri</TableHead>
                <TableHead>Bayi</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono font-semibold">{item.name}</TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900">{item.companyName}</div>
                    <div className="text-xs text-slate-500">{item.companyCode}</div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{item.dealerCompanyName || "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === item.id}
                        onClick={() => void handleStatus(item.id, "ACTIVE")}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === item.id}
                        onClick={() => void handleStatus(item.id, "PASSIVE")}
                      >
                        Pasife al
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        disabled={busyId === item.id}
                        onClick={() => setConfirmBan(item)}
                      >
                        <Ban className="mr-1 h-3.5 w-3.5" />
                        Yasakla
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <OriginatorBanDialog
        item={confirmBan}
        onCancel={() => setConfirmBan(null)}
        onConfirm={() => void handleBanExisting()}
      />
    </div>
  );
}
