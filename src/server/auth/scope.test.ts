import test from "node:test";
import assert from "node:assert/strict";

import { createInitialFleetSnapshot } from "@/server/simulation/engine";
import { scopeFleetSnapshotForSession } from "@/server/auth/scope";
import type { AuthSessionIdentity } from "@/server/auth/session";

const commandUser: AuthSessionIdentity = {
  userId: "usr_command",
  email: "command@fleet.local",
  fullName: "Command",
  roles: ["command"],
  captainShipIds: [],
};

const captainUser: AuthSessionIdentity = {
  userId: "usr_captain",
  email: "captain@fleet.local",
  fullName: "Captain",
  roles: ["captain"],
  captainShipIds: ["MV-1"],
};

test("command sessions keep the full fleet snapshot", () => {
  const snapshot = createInitialFleetSnapshot();
  const scopedSnapshot = scopeFleetSnapshotForSession(snapshot, commandUser, null);

  assert.equal(scopedSnapshot?.ships.length, snapshot.ships.length);
  assert.equal(scopedSnapshot?.directives.length, snapshot.directives.length);
});

test("captain sessions only receive assigned-ship directives and a limited nearby fleet view", () => {
  const snapshot = createInitialFleetSnapshot();
  const focusShipId = "MV-1";
  const otherShipId = snapshot.ships.find((ship) => ship.shipId !== focusShipId)?.shipId ?? "MV-2";

  snapshot.directives = [
    {
      id: "dir_focus",
      shipId: focusShipId,
      type: "hold-position",
      issuedAt: snapshot.generatedAt,
      issuedBy: "command",
      status: "accepted",
    },
    {
      id: "dir_other",
      shipId: otherShipId,
      type: "reroute-port",
      issuedAt: snapshot.generatedAt,
      issuedBy: "command",
      status: "pending",
      targetPortId: snapshot.ships[0]?.destinationPortId,
    },
  ];
  snapshot.captainResponses = [
    {
      id: "resp_focus",
      directiveId: "dir_focus",
      shipId: focusShipId,
      response: "accept",
      respondedAt: snapshot.generatedAt,
    },
    {
      id: "resp_other",
      directiveId: "dir_other",
      shipId: otherShipId,
      response: "accept",
      respondedAt: snapshot.generatedAt,
    },
  ];
  snapshot.alerts = [
    {
      id: "alert_focus",
      source: "proximity",
      severity: "warning",
      state: "active",
      title: "Focus alert",
      message: "Assigned ship alert.",
      affectedShipIds: [focusShipId],
      createdAt: snapshot.generatedAt,
    },
    {
      id: "alert_other",
      source: "weather",
      severity: "warning",
      state: "active",
      title: "Other alert",
      message: "Other ship alert.",
      affectedShipIds: [otherShipId],
      createdAt: snapshot.generatedAt,
    },
  ];
  snapshot.events = [
    {
      id: "event_focus",
      kind: "directive",
      occurredAt: snapshot.generatedAt,
      shipIds: [focusShipId],
      summary: "Focus directive",
    },
    {
      id: "event_other",
      kind: "directive",
      occurredAt: snapshot.generatedAt,
      shipIds: [otherShipId],
      summary: "Other directive",
    },
  ];

  const scopedSnapshot = scopeFleetSnapshotForSession(snapshot, captainUser, focusShipId);

  assert.ok(scopedSnapshot);
  assert.equal(scopedSnapshot.directives.length, 1);
  assert.equal(scopedSnapshot.directives[0]?.shipId, focusShipId);
  assert.equal(scopedSnapshot.captainResponses.length, 1);
  assert.equal(scopedSnapshot.captainResponses[0]?.shipId, focusShipId);
  assert.equal(scopedSnapshot.alerts.length, 1);
  assert.equal(scopedSnapshot.alerts[0]?.affectedShipIds[0], focusShipId);
  assert.equal(scopedSnapshot.events.length, 1);
  assert.equal(scopedSnapshot.events[0]?.shipIds[0], focusShipId);
  assert.ok(scopedSnapshot.ships.some((ship) => ship.shipId === focusShipId));
  assert.ok(scopedSnapshot.ships.length <= 5);
});

test("captain sessions are rejected when they ask for another ship", () => {
  const snapshot = createInitialFleetSnapshot();
  const scopedSnapshot = scopeFleetSnapshotForSession(snapshot, captainUser, "MV-9");

  assert.equal(scopedSnapshot, null);
});
