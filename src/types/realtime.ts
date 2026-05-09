import type { FleetAlert } from "@/types/alerts";
import type { ShipSnapshot } from "@/types/fleet";
import type { RestrictedZone } from "@/types/zones";

export interface FleetShipRuntimeSnapshot extends ShipSnapshot {
  lastUpdatedAt: string;
  distanceToDestinationKm: number;
  fuelBurnRateTonsPerHour: number;
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
  zones: RestrictedZone[];
  alerts: FleetAlert[];
  telemetry: FleetRuntimeTelemetry;
}

export interface FleetBootstrapPayload {
  snapshot: FleetRuntimeSnapshot;
  socketPath: string;
  protocolVersion: number;
}
