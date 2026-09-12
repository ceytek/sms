"use client";

import { useState } from "react";
import { Download, ImageIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adsService } from "../services/ads.service";
import { PriceListAd } from "../types";

interface AdPreviewModalProps {
  ad: PriceListAd;
  onClose: () => void;
}

export function AdPreviewModal({ ad, onClose }: AdPreviewModalProps) {
  const [downloading, setDownloading] = useState<"png" | "svg" | null>(null);

  const handlePng = async () => {
    setDownloading("png");
    try {
      await adsService.downloadPng(ad);
    } finally {
      setDownloading(null);
    }
  };

  const handleSvg = () => {
    setDownloading("svg");
    adsService.downloadSvg(ad);
    setDownloading(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Instagram Reklamı</h3>
            <p className="text-xs text-slate-500">{ad.listName} · 1080×1080</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto bg-slate-950 p-5">
          <img
            src={adsService.svgDataUrl(ad.svg)}
            alt={`${ad.listName} reklam görseli`}
            className="mx-auto w-full max-w-[480px] rounded-xl shadow-lg"
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={handleSvg} disabled={!!downloading}>
            {downloading === "svg" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="mr-1.5 h-4 w-4" />
            )}
            SVG İndir
          </Button>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={handlePng}
            disabled={!!downloading}
          >
            {downloading === "png" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-4 w-4" />
            )}
            PNG İndir
          </Button>
        </div>
      </div>
    </div>
  );
}
