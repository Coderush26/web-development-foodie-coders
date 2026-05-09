import type { AlertSeverity, FleetAlert } from "@/types/alerts";
import type { ShipSnapshot } from "@/types/fleet";
import type { ShipRoutePlan, ShipWeatherState } from "@/types/routing";
import type { WeatherSnapshot } from "@/types/weather";
import type { RestrictedZone } from "@/types/zones";

export type PlaybackEventKind = "alert" | "directive" | "response" | "status-change";

export interface PlaybackEvent {
  id: string;
  kind: PlaybackEventKind;
  occurredAt: string;
  shipIds: string[];
  summary: string;
  severity?: AlertSeverity;
}

export interface PlaybackShipSnapshot extends ShipSnapshot {
  lastUpdatedAt: string;
  distanceToDestinationKm: number;
  fuelBurnRateTonsPerHour: number;
  routePlan: ShipRoutePlan;
  weatherState: ShipWeatherState;
}

export interface PlaybackFrame {
  id: string;
  capturedAt: string;
  sequence: number;
  ships: PlaybackShipSnapshot[];
  zones: RestrictedZone[];
  alerts: FleetAlert[];
  weather: WeatherSnapshot | null;
  events: PlaybackEvent[];
}

export interface PlaybackHistoryPayload {
  windowMinutes: number;
  resolutionSeconds: number;
  frames: PlaybackFrame[];
}
