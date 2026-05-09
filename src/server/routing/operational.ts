import { getPortById } from "@/features/fleet/data/scenario-seed";
import { haversineDistanceKm } from "@/lib/geo/navigation";
import { getWeatherCellForPoint, getWeatherFuelMultiplier } from "@/lib/weather/open-meteo";
import { planRoute } from "@/server/routing/planner";
import { getFuelBurnRateTonsPerHour } from "@/server/simulation/fuel";
import type { GeoPoint, ShipStatus } from "@/types/fleet";
import type { FleetRuntimeSnapshot, FleetShipRuntimeSnapshot } from "@/types/realtime";
import type { ShipRoutePlan, ShipWeatherState } from "@/types/routing";
import type { WeatherSnapshot } from "@/types/weather";

const IMMUTABLE_STATUSES = new Set<ShipStatus>(["arrived", "distressed", "out-of-fuel"]);

function getIntentTarget(ship: FleetShipRuntimeSnapshot): GeoPoint | null {
  if (ship.intent.type === "waypoint" && ship.intent.waypoint) {
    return ship.intent.waypoint;
  }

  return getPortById(ship.destinationPortId)?.position ?? null;
}

function createHoldingRoutePlan(generatedAt: string): ShipRoutePlan {
  return {
    status: "holding",
    targetIntentType: "hold-position",
    points: [],
    totalDistanceKm: 0,
    directDistanceKm: 0,
    estimatedFuelRequiredTons: 0,
    fuelFeasible: true,
    recomputedAt: generatedAt,
    reason: "hold",
  };
}

function createBlockedRoutePlan(
  generatedAt: string,
  targetIntentType: ShipRoutePlan["targetIntentType"]
): ShipRoutePlan {
  return {
    status: "blocked",
    targetIntentType,
    points: [],
    totalDistanceKm: 0,
    directDistanceKm: 0,
    estimatedFuelRequiredTons: 0,
    fuelFeasible: true,
    recomputedAt: generatedAt,
    reason: "blocked",
  };
}

function createShipWeatherState(
  ship: FleetShipRuntimeSnapshot,
  weather: WeatherSnapshot | null
): ShipWeatherState {
  const cell = getWeatherCellForPoint(ship.position, weather);
  const severity = cell?.severity ?? "clear";

  return {
    cellId: cell?.id ?? null,
    severity,
    fuelMultiplier: getWeatherFuelMultiplier(severity),
    windSpeedKnots: cell?.windSpeedKnots ?? 0,
    waveHeightMeters: cell?.waveHeightMeters ?? 0,
    sampledAt: cell?.sampledAt ?? weather?.sampledAt ?? null,
  };
}

function resolveOperationalStatus(
  ship: FleetShipRuntimeSnapshot,
  routePlan: ShipRoutePlan
): ShipStatus {
  if (IMMUTABLE_STATUSES.has(ship.status)) {
    return ship.status;
  }

  if (routePlan.status === "blocked") {
    return "stranded";
  }

  if (!routePlan.fuelFeasible) {
    return "insufficient-fuel";
  }

  if (ship.intent.type === "hold-position") {
    return "stopped";
  }

  if (routePlan.status === "rerouting") {
    return "rerouting";
  }

  return ship.speedKnots <= 0 ? "stopped" : "normal";
}

function resolveDistanceRemaining(ship: FleetShipRuntimeSnapshot, routePlan: ShipRoutePlan) {
  if (ship.intent.type !== "hold-position") {
    return routePlan.status === "blocked" ? routePlan.directDistanceKm : routePlan.totalDistanceKm;
  }

  const destination = getPortById(ship.destinationPortId);
  return destination ? haversineDistanceKm(ship.position, destination.position) : 0;
}

function planShipOperationalState(
  ship: FleetShipRuntimeSnapshot,
  snapshot: FleetRuntimeSnapshot,
  weather: WeatherSnapshot | null
) {
  const generatedAt = snapshot.generatedAt;
  const weatherState = createShipWeatherState(ship, weather);
  const fuelBurnRateTonsPerHour = getFuelBurnRateTonsPerHour(
    ship.speedKnots,
    weatherState.fuelMultiplier
  );

  if (ship.intent.type === "hold-position") {
    const routePlan = createHoldingRoutePlan(generatedAt);

    return {
      ...ship,
      status: resolveOperationalStatus(ship, routePlan),
      distanceToDestinationKm: resolveDistanceRemaining(ship, routePlan),
      fuelBurnRateTonsPerHour,
      routePlan,
      weatherState,
    };
  }

  const target = getIntentTarget(ship);

  if (!target) {
    const routePlan = createBlockedRoutePlan(generatedAt, ship.intent.type);

    return {
      ...ship,
      status: resolveOperationalStatus(ship, routePlan),
      distanceToDestinationKm: resolveDistanceRemaining(ship, routePlan),
      fuelBurnRateTonsPerHour,
      routePlan,
      weatherState,
    };
  }

  const routePlan = planRoute({
    generatedAt,
    start: ship.position,
    target,
    targetIntentType: ship.intent.type,
    speedKnots: ship.speedKnots,
    fuelBurnRateTonsPerHour,
    fuelTons: ship.fuelTons,
    zones: snapshot.zones,
    weather,
  });

  return {
    ...ship,
    status: resolveOperationalStatus(ship, routePlan),
    distanceToDestinationKm: resolveDistanceRemaining(ship, routePlan),
    fuelBurnRateTonsPerHour,
    routePlan,
    weatherState,
  };
}

export function applyOperationalPlanning(
  snapshot: FleetRuntimeSnapshot,
  weather: WeatherSnapshot | null
): FleetRuntimeSnapshot {
  const ships = snapshot.ships.map((ship) => planShipOperationalState(ship, snapshot, weather));

  return {
    ...snapshot,
    ships,
    weather,
  };
}
