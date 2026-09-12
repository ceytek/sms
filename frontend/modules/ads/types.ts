export interface AdPackageLine {
  label: string;
  priceLabel: string;
}

export interface PriceListAd {
  listId: string;
  listName: string;
  width: number;
  height: number;
  mimeType: string;
  fileName: string;
  packages: AdPackageLine[];
  svg: string;
}
