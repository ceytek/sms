"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Bell, Check, CheckCheck, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/modules/auth";
import { originatorsService } from "@/modules/originators";
import { inboxService } from "../services/inbox.service";
import { inboxOriginatorId, type InboxNotification } from "../types";
import { InboxMessage } from "./inbox-message";

const IDLE_POLL_MS = 15000;

type OriginatorDecision = "ACTIVE" | "PASSIVE" | "BANNED";

const DECISION_LABEL: Record<OriginatorDecision, string> = {
  ACTIVE: "Onaylandı",
  PASSIVE: "Pasife alındı",
  BANNED: "Yasaklandı",
};

function formatTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  return date.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function HeaderInbox() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  const hasItemsRef = useRef(false);
  const isAdmin = authService.getUser()?.role === "ADMIN";
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmBanId, setConfirmBanId] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Record<string, OriginatorDecision>>({});
  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [removingId, setRemovingId] = useState<string | null>(null);

  openRef.current = open;
  hasItemsRef.current = items.length > 0;

  const refreshCount = useCallback(async () => {
    if (document.hidden) return;
    try {
      const result = await inboxService.unreadCount();
      setUnread(result.count);
    } catch {
      /* geçici hata zili sıfırlamasın */
    }
  }, []);

  const loadItems = useCallback(async (silent = false) => {
    if (document.hidden) return;
    if (!silent) setLoading(true);
    try {
      const result = await inboxService.list(15);
      setItems(result.items);
      await refreshCount();
    } catch {
      if (!silent) setItems([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [refreshCount]);

  const refreshCountRef = useRef(refreshCount);
  const loadItemsRef = useRef(loadItems);
  refreshCountRef.current = refreshCount;
  loadItemsRef.current = loadItems;

  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      if (openRef.current) {
        void loadItemsRef.current(true);
      } else {
        void refreshCountRef.current();
      }
    };

    tick();
    const timer = window.setInterval(tick, IDLE_POLL_MS);
    const onWake = () => tick();
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadItems(hasItemsRef.current);
  }, [open, loadItems]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setConfirmBanId(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const markItemRead = async (item: InboxNotification) => {
    if (item.readAt) return;
    try {
      await inboxService.markRead(item.id);
      setItems((current) =>
        current.map((row) => (row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row)),
      );
      setUnread((value) => Math.max(0, value - 1));
    } catch {
      /* işlem yine de geçerli */
    }
  };

  const openItem = async (item: InboxNotification) => {
    await markItemRead(item);
    setOpen(false);
    setConfirmBanId(null);
    if (item.eventType === "ORIGINATOR_REQUESTED") {
      router.push("/admin/originators/requests");
      return;
    }
    if (item.href) router.push(item.href);
  };

  const decide = async (item: InboxNotification, decision: OriginatorDecision) => {
    const originatorId = inboxOriginatorId(item);
    if (!originatorId) return;
    setBusyId(item.id);
    setActionError((current) => ({ ...current, [item.id]: "" }));
    try {
      if (decision === "BANNED") {
        await originatorsService.banExisting(originatorId);
      } else {
        await originatorsService.updateStatus(originatorId, decision);
      }
      setResolved((current) => ({ ...current, [item.id]: decision }));
      setConfirmBanId(null);
      await markItemRead(item);
    } catch (err) {
      setActionError((current) => ({
        ...current,
        [item.id]: err instanceof Error ? err.message : "İşlem başarısız",
      }));
    } finally {
      setBusyId(null);
    }
  };

  const removeItem = async (item: InboxNotification) => {
    setRemovingId(item.id);
    try {
      await inboxService.remove(item.id);
      setItems((current) => current.filter((row) => row.id !== item.id));
      if (!item.readAt) {
        setUnread((value) => Math.max(0, value - 1));
      }
      setConfirmBanId((current) => (current === item.id ? null : current));
    } catch {
      /* listede kalsın */
    } finally {
      setRemovingId(null);
    }
  };

  const markAll = async () => {
    try {
      await inboxService.markAllRead();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
      setUnread(0);
    } catch {
      /* sessiz */
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-gray-100"
        aria-label="Bildirimler"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[24rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Bildirimler</p>
            <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => void markAll()} disabled={!unread}>
              <CheckCheck className="mr-1 h-3.5 w-3.5" />
              Tümünü oku
            </Button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              </div>
            )}
            {!loading && items.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-slate-500">Bildirim yok.</p>
            )}
            {!loading &&
              items.map((item) => {
                const originatorId = inboxOriginatorId(item);
                const canDecide =
                  isAdmin && item.eventType === "ORIGINATOR_REQUESTED" && Boolean(originatorId);
                const decision = resolved[item.id];
                const error = actionError[item.id];
                return (
                  <div
                    key={item.id}
                    className={`border-b border-slate-100 px-4 py-3 last:border-b-0 ${
                      item.readAt ? "bg-white" : "bg-blue-50/60"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                    <button type="button" onClick={() => void openItem(item)} className="min-w-0 flex-1 text-left">
                      <p className="text-sm font-medium text-slate-900">{item.title}</p>
                      <InboxMessage item={item} />
                      <p className="mt-1 text-[11px] text-slate-400">{formatTime(item.createdAt)}</p>
                    </button>
                    <button
                      type="button"
                      className="mt-0.5 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                      aria-label="Bildirimi sil"
                      disabled={removingId === item.id}
                      onClick={() => void removeItem(item)}
                    >
                      {removingId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                    </div>
                    {canDecide && !decision && (
                      <div className="mt-2">
                        {confirmBanId === item.id ? (
                          <div className="rounded-lg border border-red-100 bg-red-50 px-2 py-2">
                            <p className="text-[11px] text-red-700">Bu başlık yasaklanacak. Emin misiniz?</p>
                            <div className="mt-2 flex gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                disabled={busyId === item.id}
                                onClick={() => setConfirmBanId(null)}
                              >
                                Vazgeç
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 px-2 text-xs"
                                disabled={busyId === item.id}
                                onClick={() => void decide(item, "BANNED")}
                              >
                                {busyId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yasakla"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              disabled={busyId === item.id}
                              onClick={() => void decide(item, "ACTIVE")}
                            >
                              {busyId === item.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="mr-1 h-3.5 w-3.5" />
                              )}
                              Onayla
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              disabled={busyId === item.id}
                              onClick={() => void decide(item, "PASSIVE")}
                            >
                              Pasife al
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                              disabled={busyId === item.id}
                              onClick={() => setConfirmBanId(item.id)}
                            >
                              <Ban className="mr-1 h-3.5 w-3.5" />
                              Yasakla
                            </Button>
                          </div>
                        )}
                        {error && <p className="mt-1.5 text-[11px] text-red-600">{error}</p>}
                      </div>
                    )}
                    {decision && (
                      <p className="mt-2 text-[11px] font-medium text-emerald-700">{DECISION_LABEL[decision]}</p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
