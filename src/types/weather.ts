import type { GeoPoint } from "@/types/fleet";

export type WeatherSeverity = "clear" | "watch" | "adverse";

export interface WeatherCell {
  id: string;
  center: GeoPoint;
  windSpeedKnots: number;
  waveHeightMeters: number;
  severity: WeatherSeverity;
  sampledAt: string;
}

export interface WeatherSnapshot {
  provider: "open-meteo" | "stormglass";
  sampledAt: string;
  cells: WeatherCell[];
}
