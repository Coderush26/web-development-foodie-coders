import test from "node:test";
import assert from "node:assert/strict";

import { createInitialFleetSnapshot } from "@/server/simulation/engine";
import {
  buildZoneMembershipByZoneId,
  hasOperationalPersistenceChanges,
  hydrateOperationalSnapshot,
} from "@/server/persistence/state";
import type { FleetRuntimeSnapshot } from "@/types/realtime";

function cloneSnapshot() {
  return structuredClone(createInitialFleetSnapshot()) as FleetRuntimeSnapshot;
}

test("hydrateOperationalSnapshot restores persisted zones, alerts, directives, and captain responses", () => {
  const baseSnapshot = cloneSnapshot();
  const persistedState = {
    zones: [
      {
        id: "zone_1",
        name: "Northern corridor",
        points: [
          { lat: 26.4, lng: 56.1 },
          { lat: 26.5, lng: 56.2 },
          { lat: 26.45, lng: 56.35 },
        ],
        createdAt: baseSnapshot.generatedAt,
        updatedAt: baseSnapshot.generatedAt,
      },
    ],
    directives: [
      {
        id: "dir_1",
        shipId: "MV-1",
        type: "reroute-port" as const,
        issuedAt: baseSnapshot.generatedAt,
        issuedBy: "command" as const,
        status: "accepted" as const,
        targetPortId: "KWT-1",
        appliedAt: baseSnapshot.generatedAt,
      },
    ],
    captainResponses: [
      {
        id: "resp_1",
        directiveId: "dir_1",
        shipId: "MV-1",
        response: "accept" as const,
        respondedAt: baseSnapshot.generatedAt,
      },
    ],
    alerts: [
      {
        id: "alert_1",
        source: "system" as const,
        severity: "warning" as const,
        state: "active" as const,
        title: "Persisted alert",
        message: "This alert should survive restart.",
        affectedShipIds: ["MV-1"],
        createdAt: baseSnapshot.generatedAt,
        metadata: { shipId: "MV-1", kind: "insufficient-fuel" },
      },
    ],
  };

  const hydratedSnapshot = hydrateOperationalSnapshot(baseSnapshot, persistedState);
  const hydratedShip = hydratedSnapshot.ships.find((ship) => ship.shipId === "MV-1");

  assert.equal(hydratedSnapshot.zones.length, 1);
  assert.equal(hydratedSnapshot.alerts.length, 1);
  assert.equal(hydratedSnapshot.directives.length, 1);
  assert.equal(hydratedSnapshot.captainResponses.length, 1);
  assert.equal(hydratedShip?.destinationPortId, "KWT-1");
  assert.equal(hydratedShip?.intent.type, "destination-port");
  assert.equal(hydratedShip?.intent.portId, "KWT-1");
});

test("hydrateOperationalSnapshot replays the latest directive outcome for each ship", () => {
  const baseSnapshot = cloneSnapshot();
  const persistedState = {
    zones: [],
    alerts: [],
    captainResponses: [],
    directives: [
      {
        id: "dir_old",
        shipId: "MV-1",
        type: "hold-position" as const,
        issuedAt: "2026-05-09T10:00:00.000Z",
        issuedBy: "command" as const,
        status: "accepted" as const,
        appliedAt: "2026-05-09T10:01:00.000Z",
      },
      {
        id: "dir_new",
        shipId: "MV-1",
        type: "divert-waypoint" as const,
        issuedAt: "2026-05-09T10:02:00.000Z",
        issuedBy: "command" as const,
        status: "accepted" as const,
        waypoint: { lat: 25.9, lng: 56.5 },
        appliedAt: "2026-05-09T10:03:00.000Z",
      },
    ],
  };

  const hydratedSnapshot = hydrateOperationalSnapshot(baseSnapshot, persistedState);
  const hydratedShip = hydratedSnapshot.ships.find((ship) => ship.shipId === "MV-1");

  assert.equal(hydratedShip?.intent.type, "waypoint");
  assert.equal(hydratedShip?.intent.waypoint?.lat, 25.9);
  assert.equal(hydratedShip?.intent.waypoint?.lng, 56.5);
});

test("hasOperationalPersistenceChanges ignores plain movement ticks and detects persisted-slice changes", () => {
  const previousSnapshot = cloneSnapshot();
  const nextSnapshot = cloneSnapshot();

  nextSnapshot.sequence = previousSnapshot.sequence + 1;
  nextSnapshot.generatedAt = "2026-05-09T10:05:00.000Z";
  nextSnapshot.ships[0] = {
    ...nextSnapshot.ships[0],
    position: {
      lat: nextSnapshot.ships[0].position.lat + 0.02,
      lng: nextSnapshot.ships[0].position.lng,
    },
  };

  assert.equal(hasOperationalPersistenceChanges(previousSnapshot, nextSnapshot), false);

  nextSnapshot.alerts = [
    {
      id: "alert_2",
      source: "geofence",
      severity: "critical",
      state: "active",
      title: "New alert",
      message: "Persist this alert.",
      affectedShipIds: ["MV-2"],
      createdAt: nextSnapshot.generatedAt,
      metadata: { shipId: "MV-2", zoneId: "zone_2" },
    },
  ];

  assert.equal(hasOperationalPersistenceChanges(previousSnapshot, nextSnapshot), true);
});

test("buildZoneMembershipByZoneId reconstructs zone occupancy from the hydrated snapshot", () => {
  const snapshot = cloneSnapshot();
  snapshot.zones = [
    {
      id: "zone_current",
      name: "Current vessel zone",
      points: [
        { lat: snapshot.ships[0].position.lat - 0.5, lng: snapshot.ships[0].position.lng - 0.5 },
        { lat: snapshot.ships[0].position.lat - 0.5, lng: snapshot.ships[0].position.lng + 0.5 },
        { lat: snapshot.ships[0].position.lat + 0.5, lng: snapshot.ships[0].position.lng + 0.5 },
        { lat: snapshot.ships[0].position.lat + 0.5, lng: snapshot.ships[0].position.lng - 0.5 },
      ],
      createdAt: snapshot.generatedAt,
      updatedAt: snapshot.generatedAt,
    },
  ];

  const membership = buildZoneMembershipByZoneId(snapshot);

  assert.equal(membership.get("zone_current")?.has(snapshot.ships[0].shipId), true);
});
