import assert from "node:assert/strict";
import test from "node:test";

import { getPortById } from "@/features/fleet/data/scenario-seed";
import { applyOperationalPlanning } from "@/server/routing/operational";
import { planRoute } from "@/server/routing/planner";
import { createInitialFleetSnapshot } from "@/server/simulation/engine";
import type { GeoPoint } from "@/types/fleet";
import type { WeatherSeverity, WeatherSnapshot } from "@/types/weather";
import type { RestrictedZone } from "@/types/zones";

function createRectangleZone(
  id: string,
  center: GeoPoint,
  latRadius: number,
  lngRadius: number
): RestrictedZone {
  const generatedAt = new Date().toISOString();

  return {
    id,
    name: id,
    createdAt: generatedAt,
    updatedAt: generatedAt,
    points: [
      { lat: center.lat + latRadius, lng: center.lng - lngRadius },
      { lat: center.lat + latRadius, lng: center.lng + lngRadius },
      { lat: center.lat - latRadius, lng: center.lng + lngRadius },
      { lat: center.lat - latRadius, lng: center.lng - lngRadius },
    ],
  };
}

function createWeatherSnapshot(severity: WeatherSeverity, center: GeoPoint): WeatherSnapshot {
  return {
    provider: "fallback",
    sampledAt: "2026-05-09T10:00:00.000Z",
    usingFallback: true,
    cells: [
      {
        id: `weather-${severity}`,
        center,
        windSpeedKnots: severity === "adverse" ? 31 : severity === "watch" ? 20 : 8,
        waveHeightMeters: severity === "adverse" ? 3.1 : severity === "watch" ? 1.8 : 0.8,
        severity,
        sampledAt: "2026-05-09T10:00:00.000Z",
      },
    ],
  };
}

function getShip(snapshot: ReturnType<typeof createInitialFleetSnapshot>, shipId: string) {
  const ship = snapshot.ships.find((entry) => entry.shipId === shipId);

  assert.ok(ship, `Expected ship ${shipId} to exist in the runtime snapshot.`);
  return ship;
}

test("route planning reroutes around a zone that cuts through the direct path", () => {
  const snapshot = createInitialFleetSnapshot();
  const ship = getShip(snapshot, "MV-3");
  const target = getPortById(ship.destinationPortId)?.position;

  assert.ok(target, "Expected a target port for the reroute test.");

  const baselineRoute = planRoute({
    generatedAt: snapshot.generatedAt,
    start: ship.position,
    target,
    targetIntentType: "destination-port",
    speedKnots: ship.speedKnots,
    fuelBurnRateTonsPerHour: ship.fuelBurnRateTonsPerHour,
    fuelTons: ship.fuelTons,
    zones: [],
    weather: createWeatherSnapshot("clear", ship.position),
  });

  const routePlan = planRoute({
    generatedAt: snapshot.generatedAt,
    start: ship.position,
    target,
    targetIntentType: "destination-port",
    speedKnots: ship.speedKnots,
    fuelBurnRateTonsPerHour: ship.fuelBurnRateTonsPerHour,
    fuelTons: ship.fuelTons,
    zones: [createRectangleZone("direct-path-zone", { lat: 25.45, lng: 55.55 }, 0.2, 0.25)],
    weather: createWeatherSnapshot("clear", ship.position),
  });

  assert.equal(routePlan.status, "rerouting");
  assert.ok(routePlan.points.length > 1, "Expected an alternate route around the zone.");
  assert.equal(routePlan.reason, "zone");
  assert.notDeepEqual(routePlan.points, baselineRoute.points);
});

test("route planning lets a ship exit a zone it already occupies", () => {
  const snapshot = createInitialFleetSnapshot();
  const ship = getShip(snapshot, "MV-1");
  const target = getPortById(ship.destinationPortId)?.position;

  assert.ok(target, "Expected a target port for the exit-route test.");

  const routePlan = planRoute({
    generatedAt: snapshot.generatedAt,
    start: ship.position,
    target,
    targetIntentType: "destination-port",
    speedKnots: ship.speedKnots,
    fuelBurnRateTonsPerHour: ship.fuelBurnRateTonsPerHour,
    fuelTons: ship.fuelTons,
    zones: [createRectangleZone("start-zone", ship.position, 0.12, 0.12)],
    weather: createWeatherSnapshot("clear", ship.position),
  });

  assert.notEqual(routePlan.status, "blocked");
  assert.ok(routePlan.points.length > 0, "Expected a route that leaves the restricted area.");
});

test("operational planning marks ships as insufficient-fuel under adverse weather", () => {
  const snapshot = createInitialFleetSnapshot();
  const plannedSnapshot = applyOperationalPlanning(
    {
      ...snapshot,
      ships: snapshot.ships.map((ship) =>
        ship.shipId === "MV-3"
          ? {
              ...ship,
              fuelTons: 5,
            }
          : ship
      ),
    },
    createWeatherSnapshot("adverse", { lat: 25.5, lng: 55.5 })
  );
  const ship = getShip(plannedSnapshot, "MV-3");

  assert.equal(ship.status, "insufficient-fuel");
  assert.equal(ship.routePlan.fuelFeasible, false);
  assert.ok(ship.routePlan.estimatedFuelRequiredTons > ship.fuelTons);
  assert.equal(ship.weatherState.severity, "adverse");
  assert.ok(
    ship.fuelBurnRateTonsPerHour >
      snapshot.ships.find((entry) => entry.shipId === "MV-3")!.fuelBurnRateTonsPerHour
  );
});
