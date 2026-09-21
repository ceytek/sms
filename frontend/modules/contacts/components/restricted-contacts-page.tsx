"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { selectClass } from "../types";
import {
  originatorLabel,
  originatorRestrictionsService,
  type OriginatorRestrictionRecord,
  type RestrictionOriginator,
} from "../services/originator-restrictions.service";

const COPY: Record<
  "BLACKLIST" | "SMS_BLOCKED",
  { title: string; description: string; addLabel: string; empty: string }
> = {
  BLACKLIST: {
    title: "Yasaklı",
    description:
      "Liste originatöre göredir. Bir başlıkta yasaklı olan numara, aynı firmanın başka originatöründe serbest kalabilir.",
    addLabel: "Yasaklılara Ekle",
    empty: "Bu originatör için yasaklı numara yok",
  },
  SMS_BLOCKED: {
    title: "SMS Gönderilmeyecek",
    description:
      "Liste originatöre göredir. Seçili başlıktan SMS gitmez; diğer originatörler etkilenmez.",
    addLabel: "Listeye Ekle",
    empty: "Bu originatör için kayıt yok",
  },
};

export function RestrictedContactsPage({
  status,
}: {
  status: "BLACKLIST" | "SMS_BLOCKED";
  audience?: "customer" | "dealer";
}) {
  const copy = COPY[status];
  const [originators, setOriginators] = useState<RestrictionOriginator[]>([]);
  const [originatorId, setOriginatorId] = useState("");
  const [entryMode, setEntryMode] = useState<"single" | "bulk">("single");
  const [items, setItems] = useState<OriginatorRestrictionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [notes, setNotes] = useState("");
  const [bulkNumbers, setBulkNumbers] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const limit = 20;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const selectedOriginator = originators.find((item) => item.id === originatorId);

  const loadOriginators = useCallback(async () => {
    try {
      const list = await originatorRestrictionsService.listOriginators();
      setOriginators(list);
      setOriginatorId((current) => current || list[0]?.id || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Originatörler yüklenemedi");
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await originatorRestrictionsService.list({
        type: status,
        originatorId: originatorId || undefined,
        search,
        page,
        limit,
      });
      setItems(list.items);
      setTotal(list.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Liste yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [originatorId, search, status, page]);

  useEffect(() => {
    void loadOriginators();
  }, [loadOriginators]);

  useEffect(() => {
    void load();
  }, [load]);

  const addOne = async () => {
    if (!originatorId) {
      setError("Önce originatör seçin");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await originatorRestrictionsService.create({
        originatorId,
        type: status,
        mobilePhone,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setMobilePhone("");
      setFirstName("");
      setLastName("");
      setNotes("");
      setPage(1);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eklenemedi");
    } finally {
      setSaving(false);
    }
  };

  const addBulk = async () => {
    if (!originatorId) {
      setError("Önce originatör seçin");
      return;
    }
    const lines = bulkNumbers.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean);
    if (!lines.length) return;
    setSaving(true);
    setError("");
    try {
      const result = await originatorRestrictionsService.createBulk({
        originatorId,
        type: status,
        numbers: lines,
      });
      setBulkNumbers("");
      setPage(1);
      await load();
      if (result.skipped) {
        setError(`${result.created} numara eklendi, ${result.skipped} geçersiz atlandı`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toplu ekleme başarısız");
    } finally {
      setSaving(false);
    }
  };

  const restore = async (id: string) => {
    setError("");
    try {
      await originatorRestrictionsService.remove(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">{copy.title}</h1>
      <p className="mb-6 text-sm text-slate-500">{copy.description}</p>

      <div className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="max-w-sm space-y-1.5">
          <Label>Originatör *</Label>
          <select
            className={selectClass}
            value={originatorId}
            onChange={(event) => {
              setOriginatorId(event.target.value);
              setPage(1);
            }}
          >
            {originators.length === 0 && <option value="">Aktif originatör yok</option>}
            {originators.map((item) => (
              <option key={item.id} value={item.id}>
                {originatorLabel(item)}
              </option>
            ))}
          </select>
          {selectedOriginator?.providerName && (
            <p className="text-xs text-slate-500">
              Bu liste yalnızca {originatorLabel(selectedOriginator)} başlığı için geçerlidir.
            </p>
          )}
        </div>

        {!originators.length && (
          <p className="text-sm text-amber-700">
            Numara eklemek için önce bu hesaba aktif bir originatör tanımlayın.
          </p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={entryMode === "single" ? "default" : "outline"}
            className={entryMode === "single" ? "bg-blue-600 hover:bg-blue-700" : ""}
            disabled={!originatorId}
            onClick={() => {
              setEntryMode("single");
              setBulkNumbers("");
            }}
          >
            Tekil numara
          </Button>
          <Button
            type="button"
            size="sm"
            variant={entryMode === "bulk" ? "default" : "outline"}
            className={entryMode === "bulk" ? "bg-blue-600 hover:bg-blue-700" : ""}
            disabled={!originatorId}
            onClick={() => {
              setEntryMode("bulk");
              setMobilePhone("");
              setFirstName("");
              setLastName("");
              setNotes("");
            }}
          >
            Toplu numara
          </Button>
        </div>

        {entryMode === "single" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
              <div className="space-y-1.5">
                <Label>Cep Telefonu *</Label>
                <Input value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} placeholder="0532 000 00 00" disabled={!originatorId} />
              </div>
              <div className="space-y-1.5">
                <Label>Ad</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={!originatorId} />
              </div>
              <div className="space-y-1.5">
                <Label>Soyad</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={!originatorId} />
              </div>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => void addOne()}
                disabled={saving || !mobilePhone.trim() || !originatorId}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Plus className="mr-2 h-4 w-4" />
                {copy.addLabel}
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label>Not</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="İsteğe bağlı" disabled={!originatorId} />
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <Label>Toplu numara ekle</Label>
            <Textarea rows={4} value={bulkNumbers} onChange={(e) => setBulkNumbers(e.target.value)} placeholder={"05321112233\n05332223344"} disabled={!originatorId} />
            <Button variant="outline" onClick={() => void addBulk()} disabled={saving || !bulkNumbers.trim() || !originatorId}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Numaraları Listeye Ekle
            </Button>
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-9" placeholder="Ad, telefon, originatör ara..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Originatör</TableHead>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>Cep Telefonu</TableHead>
              <TableHead>Not</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-slate-400">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                </TableCell>
              </TableRow>
            )}
            {!loading && items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-slate-900">{originatorLabel(item)}</TableCell>
                <TableCell>{`${item.firstName} ${item.lastName}`.trim() || "—"}</TableCell>
                <TableCell>{item.formattedPhone}</TableCell>
                <TableCell className="max-w-[180px] truncate text-slate-500">{item.notes || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => void restore(item.id)}>Listeden Çıkar</Button>
                </TableCell>
              </TableRow>
            ))}
            {!loading && !items.length && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-slate-400">{copy.empty}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between px-4 py-3 text-sm text-slate-500">
          <span>Toplam {total} kayıt</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Önceki</Button>
            <span>{page} / {pageCount}</span>
            <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Sonraki</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
