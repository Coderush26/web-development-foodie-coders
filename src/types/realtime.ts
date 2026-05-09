import type { ShipSnapshot } from "@/types/fleet";

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
  telemetry: FleetRuntimeTelemetry;
}

export interface FleetBootstrapPayload {
  snapshot: FleetRuntimeSnapshot;
  socketPath: string;
  protocolVersion: number;
}
