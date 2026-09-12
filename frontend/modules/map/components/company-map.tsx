"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Phone, X } from "lucide-react";
import { GoogleMapCanvas } from "./google-map-canvas";
import { mapService } from "../services/map.service";
import type { MapFilter, MapPoint, MapSummary } from "../types";

const STATUS_LABEL: Record<MapPoint["status"], string> = {
  ACTIVE: "Aktif",
  PASSIVE: "Pasif",
  SUSPENDED: "Askıda",
};

function matchesFilter(point: MapPoint, filter: MapFilter) {
  if (filter === "DEALER") return point.isDealer;
  if (filter === "CUSTOMER") return !point.isDealer;
  return true;
}

export function CompanyMap({ userRole }: { userRole: string }) {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [summary, setSummary] = useState<MapSummary | null>(null);
  const [filter, setFilter] = useState<MapFilter>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    mapService
      .getPoints()
      .then((result) => {
        if (cancelled) return;
        setPoints(result.points);
        setSummary(result.summary);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Harita yüklenemedi");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visiblePoints = useMemo(
    () => points.filter((point) => matchesFilter(point, filter)),
    [points, filter],
  );
  const selected = visiblePoints.find((point) => point.id === selectedId) ?? null;

  return (
    <div className="relative h-[calc(100dvh-4rem)] overflow-hidden bg-slate-100">
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
          {error}
        </div>
      ) : (
        <GoogleMapCanvas
          points={visiblePoints}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
        />
      )}

      <div className="pointer-events-none absolute inset-x-4 top-4 z-[1] flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-3">
          {userRole !== "DEALER" && (
            <div className="pointer-events-auto flex rounded-2xl border border-white/80 bg-white/95 p-1 shadow-lg shadow-slate-900/10 backdrop-blur">
              {(
                [
                  ["ALL", "Tümü"],
                  ["DEALER", "Bayiler"],
                  ["CUSTOMER", "Müşteriler"],
                ] as [MapFilter, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setFilter(value);
                    setSelectedId(null);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    filter === value
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="pointer-events-auto hidden w-fit rounded-2xl border border-white/80 bg-white/95 px-3 py-2.5 text-xs text-slate-600 shadow-lg shadow-slate-900/10 backdrop-blur sm:block">
            <div className="mb-1.5 font-semibold text-slate-800">Gösterim</div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              Bayi
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
              Müşteri
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
              Pasif
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/80 bg-white/95 px-3 py-2 text-sm shadow-lg shadow-slate-900/10 backdrop-blur">
          <span className="font-semibold text-slate-900">{summary?.total ?? 0}</span>
          <span className="text-slate-500">firma</span>
          <span className="text-slate-300">·</span>
          <span className="text-blue-700">{summary?.dealers ?? 0} bayi</span>
          <span className="text-slate-300">·</span>
          <span className="text-violet-700">{summary?.customers ?? 0} müşteri</span>
        </div>
      </div>

      {selected && (
        <div className="absolute bottom-6 left-4 z-[1] w-[min(100%-2rem,360px)]">
          <SelectedCard point={selected} onClose={() => setSelectedId(null)} />
        </div>
      )}
    </div>
  );
}

function SelectedCard({ point, onClose }: { point: MapPoint; onClose: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                point.isDealer
                  ? "bg-blue-50 text-blue-700"
                  : "bg-violet-50 text-violet-700"
              }`}
            >
              {point.isDealer ? "Bayi" : "Müşteri"}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                point.status === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {STATUS_LABEL[point.status]}
            </span>
          </div>
          <h2 className="mt-2 text-base font-bold text-slate-900">{point.name}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{point.companyCode}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-slate-600">
        <p className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          {point.cityName || "İl belirtilmemiş"}
          {point.plateCode ? ` · ${point.plateCode}` : ""}
        </p>
        {point.phone && (
          <p className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            {point.phone}
          </p>
        )}
      </div>

      <Link
        href={`/admin/companies/${point.id}`}
        className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        Firma detayı
      </Link>
    </div>
  );
}
