import { apiRequest } from "@/lib/api";
import type { MapPointsResponse } from "../types";

export const mapService = {
  getPoints() {
    return apiRequest<MapPointsResponse>("admin/map/points");
  },
};
