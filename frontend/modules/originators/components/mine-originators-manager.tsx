"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Check, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { originatorsService } from "../services/originators.service";
import type { OriginatorRecord } from "../types";
import { ORIGINATOR_STATUS_LABELS } from "../types";
import { originatorStatusBadgeClass } from "./originator-status";
import { OriginatorBanDialog } from "./originator-ban-dialog";

export function MineOriginatorsManager() {
  const [items, setItems] = useState<OriginatorRecord[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmBan, setConfirmBan] = useState<OriginatorRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await originatorsService.listMine();
      setItems(result.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Originatörler yüklenemedi");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    setError("");
    try {
      await originatorsService.createMine({ name });
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Başlık eklenemedi");
    } finally {
      setAdding(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-slate-900">Kendi originatörlerim</h1>
        <p className="mt-1 text-sm text-slate-500">
          En üst bayi için onaylayan bir üst bayi yoktur. Bu başlıklar kaydedilince aktif olur ve
          firma bilgisi SMS’i bu originatörlerle gönderilir.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value.toUpperCase())}
            maxLength={11}
            placeholder="Yeni başlık"
            className="max-w-xs font-mono"
          />
          <Button onClick={() => void handleAdd()} disabled={!name.trim() || adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Ekle
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-500">Henüz kendi originatörünüz yok.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="font-mono text-base font-bold text-slate-900">{item.name}</div>
                <Badge variant="outline" className={`mt-2 ${originatorStatusBadgeClass(item.status)}`}>
                  {ORIGINATOR_STATUS_LABELS[item.status]}
                </Badge>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.status !== "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === item.id}
                      onClick={() => void handleStatus(item.id, "ACTIVE")}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      Aktif et
                    </Button>
                  )}
                  {item.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === item.id}
                      onClick={() => void handleStatus(item.id, "PASSIVE")}
                    >
                      Pasife al
                    </Button>
                  )}
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
              </div>
            ))}
          </div>
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
