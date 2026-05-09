import type { FleetAlert } from "@/types/alerts";
import type { CaptainResponse, FleetDirective } from "@/types/directives";
import type { PlaybackEvent } from "@/types/playback";
import type { ShipRoutePlan, ShipWeatherState } from "@/types/routing";
import type { ShipSnapshot } from "@/types/fleet";
import type { WeatherSnapshot } from "@/types/weather";
import type { RestrictedZone } from "@/types/zones";

export interface FleetShipRuntimeSnapshot extends ShipSnapshot {
  lastUpdatedAt: string;
  distanceToDestinationKm: number;
  fuelBurnRateTonsPerHour: number;
  routePlan: ShipRoutePlan;
  weatherState: ShipWeatherState;
}

export interface FleetRuntimeTelemetry {
  viewerCount: number;
  shipCount: number;
  movingShips: number;
  arrivedShips: number;
  stoppedShips: number;
  outOfFuelShips: number;
  tickRateHz: number;
  lastTickDurationMs: number;
}

export interface FleetRuntimeSnapshot {
  scenarioName: string;
  sequence: number;
  generatedAt: string;
  simulationStartedAt: string;
  tickIntervalMs: number;
  ships: FleetShipRuntimeSnapshot[];
  weather: WeatherSnapshot | null;
  zones: RestrictedZone[];
  alerts: FleetAlert[];
  directives: FleetDirective[];
  captainResponses: CaptainResponse[];
  events: PlaybackEvent[];
  telemetry: FleetRuntimeTelemetry;
}

export interface FleetBootstrapPayload {
  snapshot: FleetRuntimeSnapshot;
  socketPath: string | null;
  protocolVersion: number;
  realtimeTransport: "websocket" | "snapshot";
  transportMessage?: string | null;
}
