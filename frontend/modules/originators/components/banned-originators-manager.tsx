"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { originatorsService } from "../services/originators.service";
import type { BannedOriginator } from "../types";

export function BannedOriginatorsManager() {
  const [banned, setBanned] = useState<BannedOriginator[]>([]);
  const [bannedName, setBannedName] = useState("");
  const [bannedReason, setBannedReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await originatorsService.listBanned();
      setBanned(result.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yasaklı originatörler yüklenemedi");
      setBanned([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async () => {
    setSaving(true);
    setError("");
    try {
      await originatorsService.addBanned({
        name: bannedName,
        reason: bannedReason || undefined,
      });
      setBannedName("");
      setBannedReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yasaklı başlık eklenemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    setBusyId(id);
    setError("");
    try {
      await originatorsService.removeBanned(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt silinemedi");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Yasaklı Originatörler</h1>
        <p className="mt-1 text-sm text-slate-500">
          Yasaklı listeye eklenen başlık bir daha tanımlanamaz. Aynı isimdeki mevcut başlıklar otomatik
          pasife alınır.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          Yasaklı başlık tüm bayi ve müşteriler için geçerlidir.
        </div>
        <div className="mb-5 grid gap-3 sm:grid-cols-[160px_1fr_auto]">
          <Input
            value={bannedName}
            onChange={(event) => setBannedName(event.target.value.toUpperCase())}
            maxLength={11}
            placeholder="YASAKLIADI"
            className="font-mono"
          />
          <Input
            value={bannedReason}
            onChange={(event) => setBannedReason(event.target.value)}
            placeholder="Gerekçe (opsiyonel)"
          />
          <Button onClick={() => void handleAdd()} disabled={!bannedName.trim() || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yasaklıya ekle"}
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        ) : banned.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Yasaklı başlık yok.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Başlık</TableHead>
                <TableHead>Gerekçe</TableHead>
                <TableHead className="text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banned.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono font-semibold">{item.name}</TableCell>
                  <TableCell className="text-slate-500">{item.reason || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === item.id}
                      onClick={() => void handleRemove(item.id)}
                    >
                      Listeden çıkar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
