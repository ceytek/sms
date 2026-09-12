export type MapFilter = "ALL" | "DEALER" | "CUSTOMER";

export interface MapPoint {
  id: string;
  companyCode: string;
  name: string;
  isDealer: boolean;
  status: "ACTIVE" | "PASSIVE" | "SUSPENDED";
  cityId?: number;
  cityName?: string;
  plateCode?: string;
  email?: string;
  phone?: string;
  lat: number;
  lng: number;
}

export interface MapSummary {
  total: number;
  dealers: number;
  customers: number;
  cities: number;
  unlocated: number;
}

export interface MapPointsResponse {
  points: MapPoint[];
  summary: MapSummary;
}
