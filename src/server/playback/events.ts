import { randomUUID } from "node:crypto";

import type { AlertSeverity } from "@/types/alerts";
import type { ShipStatus } from "@/types/fleet";
import type { PlaybackEvent } from "@/types/playback";
import type { FleetRuntimeSnapshot } from "@/types/realtime";

const LIVE_EVENT_LIMIT = 20;

function sortEvents(events: PlaybackEvent[]) {
  return [...events].sort(
    (left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt)
  );
}

function resolveStatusSeverity(status: ShipStatus): AlertSeverity | undefined {
  if (status === "distressed" || status === "stranded" || status === "out-of-fuel") {
    return "critical";
  }

  if (status === "insufficient-fuel" || status === "rerouting") {
    return "warning";
  }

  return undefined;
}

function createAlertCreatedEvent(
  snapshot: FleetRuntimeSnapshot,
  alertId: string
): PlaybackEvent | null {
  const alert = snapshot.alerts.find((entry) => entry.id === alertId);

  if (!alert) {
    return null;
  }

  return {
    id: randomUUID(),
    kind: "alert",
    occurredAt: alert.createdAt,
    shipIds: alert.affectedShipIds,
    summary: `Alert raised: ${alert.title}`,
    severity: alert.severity,
  };
}

function createAlertStateEvent(
  snapshot: FleetRuntimeSnapshot,
  alertId: string
): PlaybackEvent | null {
  const alert = snapshot.alerts.find((entry) => entry.id === alertId);

  if (!alert) {
    return null;
  }

  const occurredAt =
    (alert.state === "resolved" ? alert.resolvedAt : alert.acknowledgedAt) ?? snapshot.generatedAt;
  const stateLabel = alert.state === "resolved" ? "resolved" : "acknowledged";

  return {
    id: randomUUID(),
    kind: "alert",
    occurredAt,
    shipIds: alert.affectedShipIds,
    summary: `Alert ${stateLabel}: ${alert.title}`,
    severity: alert.severity,
  };
}

function createStatusChangeEvent(
  snapshot: FleetRuntimeSnapshot,
  shipId: string,
  previousStatus: ShipStatus,
  nextStatus: ShipStatus
): PlaybackEvent | null {
  const ship = snapshot.ships.find((entry) => entry.shipId === shipId);

  if (!ship) {
    return null;
  }

  return {
    id: randomUUID(),
    kind: "status-change",
    occurredAt: ship.lastUpdatedAt,
    shipIds: [shipId],
    summary: `${ship.name} changed status from ${previousStatus} to ${nextStatus}.`,
    severity: resolveStatusSeverity(nextStatus),
  };
}

function collectNewSnapshotEvents(
  previousSnapshot: FleetRuntimeSnapshot,
  nextSnapshot: FleetRuntimeSnapshot
) {
  const previousEventIds = new Set(previousSnapshot.events.map((event) => event.id));

  return nextSnapshot.events.filter((event) => !previousEventIds.has(event.id));
}

function collectAlertEvents(
  previousSnapshot: FleetRuntimeSnapshot,
  nextSnapshot: FleetRuntimeSnapshot
) {
  const previousAlertById = new Map(
    previousSnapshot.alerts.map((alert) => [alert.id, alert] as const)
  );
  const alertEvents: PlaybackEvent[] = [];

  for (const alert of nextSnapshot.alerts) {
    const previousAlert = previousAlertById.get(alert.id);

    if (!previousAlert) {
      const createdEvent = createAlertCreatedEvent(nextSnapshot, alert.id);

      if (createdEvent) {
        alertEvents.push(createdEvent);
      }

      continue;
    }

    if (previousAlert.state === alert.state) {
      continue;
    }

    const stateEvent = createAlertStateEvent(nextSnapshot, alert.id);

    if (stateEvent) {
      alertEvents.push(stateEvent);
    }
  }

  return alertEvents;
}

function collectStatusEvents(
  previousSnapshot: FleetRuntimeSnapshot,
  nextSnapshot: FleetRuntimeSnapshot
) {
  const previousShipById = new Map(
    previousSnapshot.ships.map((ship) => [ship.shipId, ship] as const)
  );
  const statusEvents: PlaybackEvent[] = [];

  for (const ship of nextSnapshot.ships) {
    const previousShip = previousShipById.get(ship.shipId);

    if (!previousShip || previousShip.status === ship.status) {
      continue;
    }

    const event = createStatusChangeEvent(
      nextSnapshot,
      ship.shipId,
      previousShip.status,
      ship.status
    );

    if (event) {
      statusEvents.push(event);
    }
  }

  return statusEvents;
}

export function mergeRuntimeEvents(
  previousSnapshot: FleetRuntimeSnapshot,
  nextSnapshot: FleetRuntimeSnapshot
) {
  const freshSnapshotEvents = collectNewSnapshotEvents(previousSnapshot, nextSnapshot);
  const generatedEvents = [
    ...collectAlertEvents(previousSnapshot, nextSnapshot),
    ...collectStatusEvents(previousSnapshot, nextSnapshot),
  ];
  const newEvents = sortEvents([...generatedEvents, ...freshSnapshotEvents]);

  return {
    newEvents,
    snapshot: {
      ...nextSnapshot,
      events: sortEvents([...generatedEvents, ...nextSnapshot.events]).slice(0, LIVE_EVENT_LIMIT),
    },
  };
}
