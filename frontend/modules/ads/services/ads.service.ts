import { apiRequest } from "@/lib/api";
import { PriceListAd } from "../types";

export const adsService = {
  async createPriceListAd(priceListId: string): Promise<PriceListAd> {
    return apiRequest<PriceListAd>(`admin/ads/price-lists/${priceListId}`);
  },

  svgDataUrl(svg: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  },

  downloadSvg(ad: PriceListAd) {
    const blob = new Blob([ad.svg], { type: "image/svg+xml;charset=utf-8" });
    this.triggerDownload(blob, ad.fileName);
  },

  async downloadPng(ad: PriceListAd) {
    const blob = await this.svgToPng(ad.svg, ad.width, ad.height);
    const name = ad.fileName.replace(/\.svg$/i, ".png");
    this.triggerDownload(blob, name);
  },

  async svgToPng(svg: string, width: number, height: number): Promise<Blob> {
    const url = this.svgDataUrl(svg);
    const image = new Image();
    image.decoding = "async";
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Görsel oluşturulamadı"));
    });
    image.src = url;
    await loaded;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Görsel oluşturulamadı");
    ctx.drawImage(image, 0, 0, width, height);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("PNG oluşturulamadı"))),
        "image/png",
      );
    });
  },

  triggerDownload(blob: Blob, fileName: string) {
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(href);
  },
};
