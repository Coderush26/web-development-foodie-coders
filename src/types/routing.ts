import type { GeoPoint, ShipIntentType } from "@/types/fleet";
import type { WeatherSeverity } from "@/types/weather";

export type RoutePlanStatus = "direct" | "rerouting" | "blocked" | "holding";

export type RouteRecomputeReason =
  | "initial"
  | "directive"
  | "zone"
  | "weather"
  | "blocked"
  | "hold";

export interface ShipRoutePlan {
  status: RoutePlanStatus;
  targetIntentType: ShipIntentType;
  points: GeoPoint[];
  totalDistanceKm: number;
  directDistanceKm: number;
  estimatedFuelRequiredTons: number;
  fuelFeasible: boolean;
  recomputedAt: string;
  reason: RouteRecomputeReason;
}

export interface ShipWeatherState {
  cellId: string | null;
  severity: WeatherSeverity;
  fuelMultiplier: number;
  windSpeedKnots: number;
  waveHeightMeters: number;
  sampledAt: string | null;
}
