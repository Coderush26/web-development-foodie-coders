import assert from "node:assert/strict";
import test from "node:test";

import { getFleetScenarioSeed } from "@/features/fleet/data/scenario-seed";
import { extractDistressAssessment } from "@/server/directives/distress-extractor";
import {
  acceptDirective,
  applyAcceptedDirectivesToSnapshot,
  escalateDirective,
  issueDirective,
} from "@/server/directives/service";
import { advanceFleetSnapshot, createInitialFleetSnapshot } from "@/server/simulation/engine";

function getShip(snapshot: ReturnType<typeof createInitialFleetSnapshot>, shipId: string) {
  const ship = snapshot.ships.find((entry) => entry.shipId === shipId);

  assert.ok(ship, `Expected ship ${shipId} to exist in the runtime snapshot.`);

  return ship;
}

test("accepted reroute directives change ship intent before the next simulation tick", () => {
  const scenarioSeed = getFleetScenarioSeed();
  const initialSnapshot = createInitialFleetSnapshot();
  const originalShip = initialSnapshot.ships[0];
  const targetPort = scenarioSeed.ports.find((port) => port.id !== originalShip.destinationPortId);

  assert.ok(targetPort, "Expected an alternate target port for the reroute directive test.");

  const issuedSnapshot = issueDirective(initialSnapshot, {
    shipId: originalShip.shipId,
    type: "reroute-port",
    targetPortId: targetPort.id,
    note: "Shift to the alternate convoy rendezvous port.",
  });

  assert.ok(issuedSnapshot, "Expected directive issuance to succeed.");

  const directive = issuedSnapshot.directives[0];
  const acceptedSnapshot = acceptDirective(issuedSnapshot, directive.id);

  assert.ok(acceptedSnapshot, "Expected captain acceptance to succeed.");

  const appliedSnapshot = applyAcceptedDirectivesToSnapshot(
    acceptedSnapshot,
    "2026-05-09T10:00:00.000Z"
  );
  const appliedDirective = appliedSnapshot.directives.find((entry) => entry.id === directive.id);
  const appliedShip = getShip(appliedSnapshot, originalShip.shipId);

  assert.equal(appliedDirective?.status, "accepted");
  assert.equal(appliedDirective?.appliedAt, "2026-05-09T10:00:00.000Z");
  assert.equal(appliedShip.destinationPortId, targetPort.id);
  assert.equal(appliedShip.intent.type, "destination-port");
  assert.equal(appliedShip.intent.portId, targetPort.id);

  const nextTickSnapshot = advanceFleetSnapshot(appliedSnapshot, 0, 0);
  const advancedShip = getShip(nextTickSnapshot, originalShip.shipId);

  assert.equal(advancedShip.intent.type, "destination-port");
  assert.equal(advancedShip.intent.portId, targetPort.id);
  assert.notEqual(advancedShip.headingDegrees, originalShip.headingDegrees);
  assert.equal(acceptedSnapshot.events[0]?.kind, "response");
});

test("accepted waypoint directives point the ship at the waypoint before the next tick", () => {
  const initialSnapshot = createInitialFleetSnapshot();
  const originalShip = initialSnapshot.ships[0];
  const waypoint = {
    lat: originalShip.position.lat - 0.35,
    lng: originalShip.position.lng + 0.42,
  };

  const issuedSnapshot = issueDirective(initialSnapshot, {
    shipId: originalShip.shipId,
    type: "divert-waypoint",
    waypoint,
    note: "Clear the choke point before resuming the original route.",
  });

  assert.ok(issuedSnapshot, "Expected waypoint directive issuance to succeed.");

  const directive = issuedSnapshot.directives[0];
  const acceptedSnapshot = acceptDirective(issuedSnapshot, directive.id);

  assert.ok(acceptedSnapshot, "Expected captain acceptance to succeed.");

  const appliedSnapshot = applyAcceptedDirectivesToSnapshot(
    acceptedSnapshot,
    "2026-05-09T10:02:00.000Z"
  );
  const appliedShip = getShip(appliedSnapshot, originalShip.shipId);

  assert.equal(appliedShip.intent.type, "waypoint");
  assert.equal(appliedShip.intent.waypoint?.lat, waypoint.lat);
  assert.equal(appliedShip.intent.waypoint?.lng, waypoint.lng);
  assert.notEqual(appliedShip.headingDegrees, originalShip.headingDegrees);

  const nextTickSnapshot = advanceFleetSnapshot(appliedSnapshot, 0, 0);
  const advancedShip = getShip(nextTickSnapshot, originalShip.shipId);

  assert.equal(advancedShip.intent.type, "waypoint");
  assert.equal(advancedShip.intent.waypoint?.lat, waypoint.lat);
  assert.equal(advancedShip.intent.waypoint?.lng, waypoint.lng);
});

test("accepted hold-position directives stop the ship on the next tick", () => {
  const initialSnapshot = createInitialFleetSnapshot();
  const originalShip = initialSnapshot.ships[1];

  const issuedSnapshot = issueDirective(initialSnapshot, {
    shipId: originalShip.shipId,
    type: "hold-position",
    note: "Stand by until the restricted corridor is re-opened.",
  });

  assert.ok(issuedSnapshot, "Expected hold-position directive issuance to succeed.");

  const directive = issuedSnapshot.directives[0];
  const acceptedSnapshot = acceptDirective(issuedSnapshot, directive.id);

  assert.ok(acceptedSnapshot, "Expected captain acceptance to succeed.");

  const appliedSnapshot = applyAcceptedDirectivesToSnapshot(
    acceptedSnapshot,
    "2026-05-09T10:03:00.000Z"
  );
  const appliedShip = getShip(appliedSnapshot, originalShip.shipId);

  assert.equal(appliedShip.intent.type, "hold-position");
  assert.equal(appliedShip.speedKnots, 0);
  assert.equal(appliedShip.status, "stopped");

  const nextTickSnapshot = advanceFleetSnapshot(appliedSnapshot, 0, 0);
  const advancedShip = getShip(nextTickSnapshot, originalShip.shipId);

  assert.equal(advancedShip.intent.type, "hold-position");
  assert.equal(advancedShip.speedKnots, 0);
  assert.equal(advancedShip.status, "stopped");
});

test("distress escalation uses the fallback parser and creates a structured distress alert", async () => {
  const initialSnapshot = createInitialFleetSnapshot();
  const ship = initialSnapshot.ships[0];
  const issuedSnapshot = issueDirective(initialSnapshot, {
    shipId: ship.shipId,
    type: "hold-position",
    note: "Pause movement until the corridor is clear.",
  });

  assert.ok(issuedSnapshot, "Expected directive issuance to succeed.");

  const directive = issuedSnapshot.directives[0];
  const distressMessage =
    "Mayday. Fire in the engine room, 2 crew injured, and we have lost propulsion.";
  const distressAssessment = await extractDistressAssessment(distressMessage);
  const escalatedSnapshot = escalateDirective(
    issuedSnapshot,
    directive.id,
    distressMessage,
    distressAssessment,
    "2026-05-09T10:05:00.000Z"
  );

  assert.ok(escalatedSnapshot, "Expected distress escalation to succeed.");

  const escalatedDirective = escalatedSnapshot.directives.find(
    (entry) => entry.id === directive.id
  );
  const response = escalatedSnapshot.captainResponses[0];
  const alert = escalatedSnapshot.alerts[0];
  const distressedShip = getShip(escalatedSnapshot, ship.shipId);

  assert.equal(distressAssessment.provider, "local");
  assert.equal(distressAssessment.severity, "critical");
  assert.equal(distressAssessment.issueType, "fire");
  assert.equal(distressAssessment.quantifiedImpact, "2 crew");
  assert.equal(escalatedDirective?.status, "escalated");
  assert.equal(response.response, "escalate-distress");
  assert.equal(response.distressAssessment?.summary, distressAssessment.summary);
  assert.equal(alert.source, "distress");
  assert.equal(alert.severity, "critical");
  assert.equal(alert.metadata?.issueType, "fire");
  assert.equal(distressedShip.status, "distressed");
  assert.equal(escalatedSnapshot.events[0]?.kind, "response");
});
