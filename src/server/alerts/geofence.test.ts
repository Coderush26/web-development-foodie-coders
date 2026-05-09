import assert from "node:assert/strict";
import test from "node:test";

import { advanceFleetSnapshot, createInitialFleetSnapshot } from "@/server/simulation/engine";
import { evaluateGeofenceState } from "@/server/alerts/geofence";
import type { GeoPoint } from "@/types/fleet";
import type { FleetRuntimeSnapshot } from "@/types/realtime";
import type { RestrictedZone } from "@/types/zones";

const TEST_SHIP_ID = "MV-1";
const DELAYED_ENTRY_TICK = 8;
const ZONE_HALF_SIZE = 0.00002;

function getShip(snapshot: FleetRuntimeSnapshot, shipId = TEST_SHIP_ID) {
  const ship = snapshot.ships.find((item) => item.shipId === shipId);

  assert.ok(ship, `Expected ship ${shipId} to exist in the runtime snapshot.`);

  return ship;
}

function createSquareZone(zoneId: string, zoneName: string, center: GeoPoint): RestrictedZone {
  const generatedAt = new Date().toISOString();

  return {
    id: zoneId,
    name: zoneName,
    createdAt: generatedAt,
    updatedAt: generatedAt,
    points: [
      { lat: center.lat + ZONE_HALF_SIZE, lng: center.lng - ZONE_HALF_SIZE },
      { lat: center.lat + ZONE_HALF_SIZE, lng: center.lng + ZONE_HALF_SIZE },
      { lat: center.lat - ZONE_HALF_SIZE, lng: center.lng + ZONE_HALF_SIZE },
      { lat: center.lat - ZONE_HALF_SIZE, lng: center.lng - ZONE_HALF_SIZE },
    ],
  };
}

function evaluateSnapshot(
  previousSnapshot: FleetRuntimeSnapshot,
  nextSnapshot: FleetRuntimeSnapshot,
  membershipByZoneId: Map<string, Set<string>>
) {
  return evaluateGeofenceState({
    previousSnapshot,
    nextSnapshot,
    previousMembershipByZoneId: membershipByZoneId,
  });
}

test("creates an immediate geofence alert when a new zone covers an existing ship", () => {
  const previousSnapshot = createInitialFleetSnapshot();
  const ship = getShip(previousSnapshot);
  const nextSnapshot: FleetRuntimeSnapshot = {
    ...previousSnapshot,
    sequence: previousSnapshot.sequence + 1,
    generatedAt: new Date(Date.parse(previousSnapshot.generatedAt) + 1000).toISOString(),
    zones: [createSquareZone("zone-immediate", "Immediate zone", ship.position)],
    alerts: [],
  };

  const evaluation = evaluateSnapshot(previousSnapshot, nextSnapshot, new Map());
  const alert = evaluation.nextSnapshot.alerts.find(
    (entry) =>
      entry.source === "geofence" &&
      entry.metadata?.zoneId === "zone-immediate" &&
      entry.affectedShipIds.includes(TEST_SHIP_ID)
  );

  assert.ok(alert, "Expected an immediate geofence alert for the covered ship.");
  assert.equal(getShip(evaluation.nextSnapshot).status, "rerouting");
  assert.deepEqual(
    [...(evaluation.membershipByZoneId.get("zone-immediate") ?? new Set<string>())],
    [TEST_SHIP_ID]
  );
});

test("raises a delayed geofence alert exactly when a ship crosses into a future zone", () => {
  let futureSnapshot = createInitialFleetSnapshot();

  for (let tick = 1; tick <= DELAYED_ENTRY_TICK; tick += 1) {
    futureSnapshot = advanceFleetSnapshot(futureSnapshot, 0, 0);
  }

  const futureShip = getShip(futureSnapshot);
  const delayedZone = createSquareZone("zone-delayed", "Future path zone", futureShip.position);

  let currentSnapshot: FleetRuntimeSnapshot = {
    ...createInitialFleetSnapshot(),
    zones: [delayedZone],
    alerts: [],
  };
  let membershipByZoneId = new Map<string, Set<string>>();

  for (let tick = 1; tick < DELAYED_ENTRY_TICK; tick += 1) {
    const nextSnapshot = advanceFleetSnapshot(currentSnapshot, 0, 0);
    const evaluation = evaluateSnapshot(currentSnapshot, nextSnapshot, membershipByZoneId);

    currentSnapshot = evaluation.nextSnapshot;
    membershipByZoneId = evaluation.membershipByZoneId;

    assert.equal(
      currentSnapshot.alerts.filter((alert) => alert.metadata?.zoneId === delayedZone.id).length,
      0,
      `Expected no geofence alert before tick ${DELAYED_ENTRY_TICK}.`
    );
    assert.equal(getShip(currentSnapshot).status, "normal");
  }

  const entrySnapshot = advanceFleetSnapshot(currentSnapshot, 0, 0);
  const entryEvaluation = evaluateSnapshot(currentSnapshot, entrySnapshot, membershipByZoneId);
  const delayedAlert = entryEvaluation.nextSnapshot.alerts.find(
    (entry) =>
      entry.source === "geofence" &&
      entry.metadata?.zoneId === delayedZone.id &&
      entry.affectedShipIds.includes(TEST_SHIP_ID)
  );

  assert.ok(delayedAlert, "Expected a geofence alert at the delayed entry tick.");
  assert.equal(getShip(entryEvaluation.nextSnapshot).status, "rerouting");
  assert.deepEqual(
    [...(entryEvaluation.membershipByZoneId.get(delayedZone.id) ?? new Set<string>())],
    [TEST_SHIP_ID]
  );
});

test("does not duplicate unresolved geofence alerts while the ship stays inside the zone", () => {
  const previousSnapshot = createInitialFleetSnapshot();
  const ship = getShip(previousSnapshot);
  const persistentZone = createSquareZone("zone-persistent", "Persistent zone", ship.position);
  const firstNextSnapshot: FleetRuntimeSnapshot = {
    ...previousSnapshot,
    sequence: previousSnapshot.sequence + 1,
    generatedAt: new Date(Date.parse(previousSnapshot.generatedAt) + 1000).toISOString(),
    zones: [persistentZone],
    alerts: [],
  };

  const firstEvaluation = evaluateSnapshot(previousSnapshot, firstNextSnapshot, new Map());
  const secondNextSnapshot: FleetRuntimeSnapshot = {
    ...firstEvaluation.nextSnapshot,
    sequence: firstEvaluation.nextSnapshot.sequence + 1,
    generatedAt: new Date(
      Date.parse(firstEvaluation.nextSnapshot.generatedAt) + 1000
    ).toISOString(),
  };
  const secondEvaluation = evaluateSnapshot(
    firstEvaluation.nextSnapshot,
    secondNextSnapshot,
    firstEvaluation.membershipByZoneId
  );

  assert.equal(
    secondEvaluation.nextSnapshot.alerts.filter(
      (alert) => alert.metadata?.zoneId === persistentZone.id
    ).length,
    1
  );
});
