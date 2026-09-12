"use client";

import { useEffect, useRef, useState } from "react";
import type { MapPoint } from "../types";

const TURKEY_CENTER = { lat: 39.1, lng: 35.2 };

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.attraction", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "transit.station", stylers: [{ visibility: "off" }] },
];

let mapsLoader: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Harita yalnızca tarayıcıda yüklenir"));
  }
  if (window.google?.maps) return Promise.resolve();
  if (mapsLoader) return mapsLoader;

  mapsLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Maps yüklenemedi")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&language=tr&region=TR&v=weekly`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";
    script.onload = () => resolve();
    script.onerror = () => {
      mapsLoader = null;
      reject(new Error("Google Maps yüklenemedi"));
    };
    document.head.appendChild(script);
  });

  return mapsLoader;
}

function pinColor(point: { isDealer: boolean; status: string }) {
  if (point.status !== "ACTIVE") return "#64748b";
  return point.isDealer ? "#2563eb" : "#7c3aed";
}

function pinIcon(point: { isDealer: boolean; status: string }, selected: boolean) {
  const color = pinColor(point);
  const scale = selected ? 1.15 : 1;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${28 * scale}" height="${36 * scale}" viewBox="0 0 28 36">
      <path d="M14 1C6.8 1 1 6.8 1 14.1 1 23.4 14 35 14 35s13-11.6 13-20.9C27 6.8 21.2 1 14 1z" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="white"/>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(28 * scale, 36 * scale),
    anchor: new google.maps.Point(14 * scale, 34 * scale),
  };
}

interface GoogleMapCanvasProps {
  points: MapPoint[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function GoogleMapCanvas({ points, selectedId, onSelect }: GoogleMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  onSelectRef.current = onSelect;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  useEffect(() => {
    if (!apiKey) {
      setLoadError("Google Maps API anahtarı tanımlı değil.");
      return;
    }

    let cancelled = false;

    async function setup() {
      try {
        await loadGoogleMaps(apiKey);
        if (cancelled || !containerRef.current || mapRef.current) return;

        const map = new google.maps.Map(containerRef.current, {
          center: TURKEY_CENTER,
          zoom: 6,
          minZoom: 5,
          maxZoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
          gestureHandling: "greedy",
          clickableIcons: false,
          styles: MAP_STYLES,
          restriction: {
            latLngBounds: { north: 43.4, south: 35.7, west: 25.6, east: 45.3 },
            strictBounds: false,
          },
        });

        map.addListener("click", () => onSelectRef.current(null));
        mapRef.current = map;
        setReady(true);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Harita yüklenemedi");
        }
      }
    }

    void setup();

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current.clear();
      mapRef.current = null;
    };
  }, [apiKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    const bounds = new google.maps.LatLngBounds();

    points.forEach((point) => {
      const marker = new google.maps.Marker({
        map,
        position: { lat: point.lat, lng: point.lng },
        title: point.name,
        icon: pinIcon(point, point.id === selectedId),
        zIndex: point.id === selectedId ? 1000 : point.isDealer ? 20 : 10,
      });

      marker.addListener("click", () => onSelectRef.current(point.id));
      markersRef.current.set(point.id, marker);
      bounds.extend({ lat: point.lat, lng: point.lng });
    });

    if (points.length > 0 && !selectedId) {
      map.fitBounds(bounds, 80);
    }
  }, [points, selectedId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const point = points.find((item) => item.id === selectedId);
    if (!point) return;
    map.panTo({ lat: point.lat, lng: point.lng });
    if ((map.getZoom() ?? 6) < 8) map.setZoom(8);
  }, [selectedId, points]);

  if (!apiKey || loadError) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100 px-6 text-center text-sm text-slate-500">
        {loadError || "Google Maps API anahtarı tanımlı değil."}
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
