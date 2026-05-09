import assert from "node:assert/strict";
import test from "node:test";

import { mergeRuntimeEvents } from "@/server/playback/events";
import { createInitialFleetSnapshot } from "@/server/simulation/engine";
import type { FleetAlert } from "@/types/alerts";
import type { PlaybackEvent } from "@/types/playback";

test("adds alert and status-change events to the live runtime event stream", () => {
  const previousSnapshot = createInitialFleetSnapshot();
  const createdAt = new Date(Date.parse(previousSnapshot.generatedAt) + 1000).toISOString();
  const alert: FleetAlert = {
    id: "alert-1",
    source: "system",
    severity: "warning",
    state: "active",
    title: "MV-1 requires reroute",
    message: "MV-1 route is no longer valid.",
    affectedShipIds: ["MV-1"],
    createdAt,
    metadata: {
      shipId: "MV-1",
    },
  };

  const nextSnapshot = {
    ...previousSnapshot,
    generatedAt: createdAt,
    alerts: [alert],
    ships: previousSnapshot.ships.map((ship) =>
      ship.shipId === "MV-1"
        ? {
            ...ship,
            status: "rerouting" as const,
            lastUpdatedAt: createdAt,
          }
        : ship
    ),
  };
  const merged = mergeRuntimeEvents(previousSnapshot, nextSnapshot);
  const eventKinds = merged.newEvents.map((event) => event.kind);

  assert.deepEqual(eventKinds, ["alert", "status-change"]);
  assert.equal(merged.snapshot.events.length, 2);
  assert.match(merged.snapshot.events[0]?.summary ?? "", /Alert raised:/);
  assert.match(merged.snapshot.events[1]?.summary ?? "", /changed status from normal to rerouting/);
});

test("preserves new directive events while adding generated runtime events", () => {
  const previousSnapshot = createInitialFleetSnapshot();
  const occurredAt = new Date(Date.parse(previousSnapshot.generatedAt) + 1000).toISOString();
  const directiveEvent: PlaybackEvent = {
    id: "directive-1",
    kind: "directive",
    occurredAt,
    shipIds: ["MV-2"],
    summary: "Command sent directive to MV-2 (alternate port)",
  };

  const nextSnapshot = {
    ...previousSnapshot,
    generatedAt: occurredAt,
    events: [directiveEvent],
  };
  const merged = mergeRuntimeEvents(previousSnapshot, nextSnapshot);

  assert.equal(merged.newEvents.length, 1);
  assert.equal(merged.newEvents[0]?.id, directiveEvent.id);
  assert.equal(merged.snapshot.events[0]?.id, directiveEvent.id);
});
