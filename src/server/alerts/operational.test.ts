import assert from "node:assert/strict";
import test from "node:test";

import { getPortById } from "@/features/fleet/data/scenario-seed";
import { evaluateOperationalAlerts } from "@/server/alerts/operational";
import { applyOperationalPlanning } from "@/server/routing/operational";
import { createInitialFleetSnapshot } from "@/server/simulation/engine";
import type { GeoPoint } from "@/types/fleet";
import type { WeatherSnapshot } from "@/types/weather";
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

function createClearWeatherSnapshot(center: GeoPoint): WeatherSnapshot {
  return {
    provider: "fallback",
    sampledAt: "2026-05-09T10:00:00.000Z",
    usingFallback: true,
    cells: [
      {
        id: "weather-clear",
        center,
        windSpeedKnots: 8,
        waveHeightMeters: 0.8,
        severity: "clear",
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

test("creates and resolves stranded alerts when a target becomes unreachable", () => {
  const snapshot = createInitialFleetSnapshot();
  const ship = getShip(snapshot, "MV-1");
  const target = getPortById(ship.destinationPortId)?.position;

  assert.ok(target, "Expected a target port for the stranded-alert test.");

  const blockedSnapshot = evaluateOperationalAlerts(
    applyOperationalPlanning(
      {
        ...snapshot,
        zones: [createRectangleZone("sealed-port", target, 0.09, 0.09)],
      },
      createClearWeatherSnapshot(ship.position)
    )
  );
  const blockedShip = getShip(blockedSnapshot, ship.shipId);
  const activeAlert = blockedSnapshot.alerts.find(
    (alert) => alert.metadata?.kind === "stranded" && alert.metadata?.shipId === ship.shipId
  );

  assert.equal(blockedShip.status, "stranded");
  assert.equal(activeAlert?.state, "active");

  const recoveredSnapshot = evaluateOperationalAlerts(
    applyOperationalPlanning(
      {
        ...blockedSnapshot,
        zones: [],
      },
      createClearWeatherSnapshot(ship.position)
    )
  );
  const recoveredShip = getShip(recoveredSnapshot, ship.shipId);
  const resolvedAlert = recoveredSnapshot.alerts.find(
    (alert) => alert.metadata?.kind === "stranded" && alert.metadata?.shipId === ship.shipId
  );

  assert.notEqual(recoveredShip.status, "stranded");
  assert.equal(resolvedAlert?.state, "resolved");
});

test("creates and resolves proximity alerts when ships separate", () => {
  const snapshot = createInitialFleetSnapshot();
  const closeSnapshot = evaluateOperationalAlerts({
    ...snapshot,
    ships: snapshot.ships.map((ship) => {
      if (ship.shipId === "MV-1") {
        return {
          ...ship,
          position: { lat: 25.0, lng: 55.0 },
        };
      }

      if (ship.shipId === "MV-2") {
        return {
          ...ship,
          position: { lat: 25.008, lng: 55.008 },
        };
      }

      return ship;
    }),
  });
  const activeAlert = closeSnapshot.alerts.find((alert) => alert.metadata?.kind === "proximity");

  assert.equal(activeAlert?.state, "active");
  assert.deepEqual(activeAlert?.affectedShipIds.sort(), ["MV-1", "MV-2"]);

  const separatedSnapshot = evaluateOperationalAlerts({
    ...closeSnapshot,
    ships: closeSnapshot.ships.map((ship) =>
      ship.shipId === "MV-2"
        ? {
            ...ship,
            position: { lat: 27.0, lng: 57.0 },
          }
        : ship
    ),
  });
  const resolvedAlert = separatedSnapshot.alerts.find(
    (alert) => alert.metadata?.kind === "proximity"
  );

  assert.equal(resolvedAlert?.state, "resolved");
});
