import { getFleetScenarioSeed } from "@/features/fleet/data/scenario-seed";
import { bearingBetweenPoints, haversineDistanceKm, destinationPoint } from "@/lib/geo/navigation";
import type { GeoPoint, Port, ShipStatus } from "@/types/fleet";
import type {
  FleetRuntimeSnapshot,
  FleetRuntimeTelemetry,
  FleetShipRuntimeSnapshot,
} from "@/types/realtime";

import {
  ARRIVAL_RADIUS_KM,
  BASE_FUEL_BURN_TONS_PER_HOUR,
  FUEL_BURN_TONS_PER_HOUR_PER_KNOT,
  KM_PER_NAUTICAL_MILE,
  SIMULATION_TICK_MS,
  SIMULATION_TICK_RATE_HZ,
} from "@/server/simulation/constants";

const HOURS_PER_MILLISECOND = 1 / 3_600_000;
const scenarioSeed = getFleetScenarioSeed();
const portLookup = new Map(scenarioSeed.ports.map((port) => [port.id, port]));

function getDestinationPort(ship: FleetShipRuntimeSnapshot): Port | undefined {
  return portLookup.get(ship.destinationPortId);
}

function getFuelBurnRateTonsPerHour(ship: FleetShipRuntimeSnapshot) {
  return BASE_FUEL_BURN_TONS_PER_HOUR + ship.speedKnots * FUEL_BURN_TONS_PER_HOUR_PER_KNOT;
}

function getIntentTarget(
  ship: FleetShipRuntimeSnapshot
): { kind: "port" | "waypoint"; position: GeoPoint } | null {
  if (ship.intent.type === "waypoint" && ship.intent.waypoint) {
    return {
      kind: "waypoint",
      position: ship.intent.waypoint,
    };
  }

  const destination = getDestinationPort(ship);

  if (!destination) {
    return null;
  }

  return {
    kind: "port",
    position: destination.position,
  };
}

function resolveStoppedStatus(ship: FleetShipRuntimeSnapshot): ShipStatus {
  if (
    ship.status === "arrived" ||
    ship.status === "distressed" ||
    ship.status === "stranded" ||
    ship.status === "insufficient-fuel" ||
    ship.status === "out-of-fuel" ||
    ship.status === "rerouting"
  ) {
    return ship.status;
  }

  return "stopped";
}

function getTelemetry(
  ships: FleetShipRuntimeSnapshot[],
  viewerCount: number,
  lastTickDurationMs: number
): FleetRuntimeTelemetry {
  return {
    viewerCount,
    shipCount: ships.length,
    movingShips: ships.filter((ship) => ship.speedKnots > 0 && ship.status !== "arrived").length,
    arrivedShips: ships.filter((ship) => ship.status === "arrived").length,
    stoppedShips: ships.filter((ship) => ship.status === "stopped").length,
    outOfFuelShips: ships.filter((ship) => ship.status === "out-of-fuel").length,
    tickRateHz: SIMULATION_TICK_RATE_HZ,
    lastTickDurationMs,
  };
}

function resolveActiveStatus(
  ship: FleetShipRuntimeSnapshot,
  nextSpeedKnots: number,
  outOfFuel: boolean
): ShipStatus {
  if (outOfFuel) {
    return "out-of-fuel";
  }

  if (
    ship.status === "arrived" ||
    ship.status === "distressed" ||
    ship.status === "insufficient-fuel" ||
    ship.status === "out-of-fuel" ||
    ship.status === "rerouting" ||
    ship.status === "stranded"
  ) {
    return ship.status;
  }

  if (nextSpeedKnots <= 0) {
    return "stopped";
  }

  return ship.status === "normal" || ship.status === "stopped" ? "normal" : ship.status;
}

function advanceShip(
  ship: FleetShipRuntimeSnapshot,
  generatedAt: string,
  tickIntervalMs: number
): FleetShipRuntimeSnapshot {
  const destination = getDestinationPort(ship);
  const intentTarget = getIntentTarget(ship);
  const fuelBurnRateTonsPerHour = getFuelBurnRateTonsPerHour(ship);

  if (ship.intent.type === "hold-position") {
    return {
      ...ship,
      speedKnots: 0,
      status: resolveStoppedStatus(ship),
      lastUpdatedAt: generatedAt,
      fuelBurnRateTonsPerHour,
      distanceToDestinationKm: destination
        ? haversineDistanceKm(ship.position, destination.position)
        : 0,
    };
  }

  if (!destination || !intentTarget) {
    return {
      ...ship,
      lastUpdatedAt: generatedAt,
      fuelBurnRateTonsPerHour,
      distanceToDestinationKm: 0,
    };
  }

  const remainingDistanceKm = haversineDistanceKm(ship.position, intentTarget.position);

  if (
    intentTarget.kind === "port" &&
    (remainingDistanceKm <= ARRIVAL_RADIUS_KM || ship.status === "arrived")
  ) {
    return {
      ...ship,
      position: destination.position,
      speedKnots: 0,
      status: "arrived",
      lastUpdatedAt: generatedAt,
      fuelBurnRateTonsPerHour,
      distanceToDestinationKm: 0,
    };
  }

  if (intentTarget.kind === "waypoint" && remainingDistanceKm <= ARRIVAL_RADIUS_KM) {
    return {
      ...ship,
      position: intentTarget.position,
      speedKnots: 0,
      status: resolveStoppedStatus(ship),
      intent: {
        type: "hold-position",
      },
      lastUpdatedAt: generatedAt,
      fuelBurnRateTonsPerHour,
      distanceToDestinationKm: haversineDistanceKm(intentTarget.position, destination.position),
    };
  }

  if (ship.status === "out-of-fuel") {
    return {
      ...ship,
      speedKnots: 0,
      lastUpdatedAt: generatedAt,
      fuelBurnRateTonsPerHour,
      distanceToDestinationKm: remainingDistanceKm,
    };
  }

  const requestedFuel = fuelBurnRateTonsPerHour * tickIntervalMs * HOURS_PER_MILLISECOND;
  const fuelRatio = requestedFuel > 0 ? Math.min(1, ship.fuelTons / requestedFuel) : 1;
  const requestedDistanceKm =
    ship.speedKnots * KM_PER_NAUTICAL_MILE * tickIntervalMs * HOURS_PER_MILLISECOND;
  const travelledDistanceKm = requestedDistanceKm * fuelRatio;
  const outOfFuel = ship.fuelTons <= requestedFuel;

  if (travelledDistanceKm >= remainingDistanceKm) {
    return {
      ...ship,
      position: destination.position,
      speedKnots: 0,
      fuelTons: Math.max(
        0,
        ship.fuelTons - requestedFuel * Math.min(1, remainingDistanceKm / travelledDistanceKm)
      ),
      status: "arrived",
      lastUpdatedAt: generatedAt,
      fuelBurnRateTonsPerHour,
      distanceToDestinationKm: 0,
    };
  }

  const nextSpeedKnots = outOfFuel ? 0 : ship.speedKnots;
  const nextHeadingDegrees = bearingBetweenPoints(ship.position, intentTarget.position);
  const nextPosition =
    travelledDistanceKm > 0
      ? destinationPoint(ship.position, nextHeadingDegrees, travelledDistanceKm)
      : ship.position;
  const nextDistanceToDestinationKm = haversineDistanceKm(nextPosition, intentTarget.position);

  return {
    ...ship,
    position: nextPosition,
    speedKnots: nextSpeedKnots,
    headingDegrees: nextHeadingDegrees,
    fuelTons: Math.max(0, ship.fuelTons - requestedFuel),
    status: resolveActiveStatus(ship, nextSpeedKnots, outOfFuel),
    lastUpdatedAt: generatedAt,
    fuelBurnRateTonsPerHour,
    distanceToDestinationKm: nextDistanceToDestinationKm,
  };
}

export function createInitialFleetSnapshot(viewerCount = 0): FleetRuntimeSnapshot {
  const generatedAt = new Date().toISOString();
  const ships = scenarioSeed.ships.map<FleetShipRuntimeSnapshot>((ship) => ({
    ...ship,
    lastUpdatedAt: generatedAt,
    distanceToDestinationKm: haversineDistanceKm(
      ship.position,
      portLookup.get(ship.destinationPortId)?.position ?? ship.position
    ),
    fuelBurnRateTonsPerHour:
      BASE_FUEL_BURN_TONS_PER_HOUR + ship.speedKnots * FUEL_BURN_TONS_PER_HOUR_PER_KNOT,
  }));

  return {
    scenarioName: scenarioSeed.metadata.name,
    sequence: 0,
    generatedAt,
    simulationStartedAt: generatedAt,
    tickIntervalMs: SIMULATION_TICK_MS,
    ships,
    zones: [],
    alerts: [],
    directives: [],
    captainResponses: [],
    events: [],
    telemetry: getTelemetry(ships, viewerCount, 0),
  };
}

export function advanceFleetSnapshot(
  snapshot: FleetRuntimeSnapshot,
  viewerCount: number,
  lastTickDurationMs: number
): FleetRuntimeSnapshot {
  const generatedAt = new Date().toISOString();
  const ships = snapshot.ships.map((ship) =>
    advanceShip(ship, generatedAt, snapshot.tickIntervalMs)
  );

  return {
    ...snapshot,
    sequence: snapshot.sequence + 1,
    generatedAt,
    ships,
    telemetry: getTelemetry(ships, viewerCount, lastTickDurationMs),
  };
}
