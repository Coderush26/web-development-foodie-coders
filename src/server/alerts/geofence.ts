import { randomUUID } from "node:crypto";

import { didSegmentEnterPolygon, isPointInsidePolygon } from "@/lib/geo/polygon";
import type { FleetAlert } from "@/types/alerts";
import type { FleetShipRuntimeSnapshot, FleetRuntimeSnapshot } from "@/types/realtime";

type ZoneMembershipByZoneId = Map<string, Set<string>>;

type EvaluateGeofenceStateOptions = {
  previousSnapshot: FleetRuntimeSnapshot;
  nextSnapshot: FleetRuntimeSnapshot;
  previousMembershipByZoneId: ZoneMembershipByZoneId;
};

type EvaluateGeofenceStateResult = {
  nextSnapshot: FleetRuntimeSnapshot;
  membershipByZoneId: ZoneMembershipByZoneId;
};

function hasOpenGeofenceAlert(alerts: FleetAlert[], zoneId: string, shipId: string) {
  return alerts.some(
    (alert) =>
      alert.source === "geofence" &&
      alert.state !== "resolved" &&
      alert.affectedShipIds.includes(shipId) &&
      alert.metadata?.zoneId === zoneId
  );
}

function createGeofenceAlert(
  zoneId: string,
  zoneName: string,
  ship: FleetShipRuntimeSnapshot,
  createdAt: string
): FleetAlert {
  return {
    id: randomUUID(),
    source: "geofence",
    severity: "critical",
    state: "active",
    title: `${ship.name} entered ${zoneName}`,
    message: `${ship.name} is inside restricted zone ${zoneName} and should be rerouted.`,
    affectedShipIds: [ship.shipId],
    createdAt,
    metadata: {
      shipId: ship.shipId,
      zoneId,
      zoneName,
    },
  };
}

function resolveZoneStatus(
  ship: FleetShipRuntimeSnapshot,
  insideRestrictedZone: boolean
): FleetShipRuntimeSnapshot["status"] {
  if (insideRestrictedZone) {
    if (
      ship.status === "arrived" ||
      ship.status === "distressed" ||
      ship.status === "stranded" ||
      ship.status === "insufficient-fuel" ||
      ship.status === "out-of-fuel"
    ) {
      return ship.status;
    }

    return "rerouting";
  }

  if (ship.status !== "rerouting") {
    return ship.status;
  }

  return ship.speedKnots <= 0 ? "stopped" : "normal";
}

export function evaluateGeofenceState({
  previousSnapshot,
  nextSnapshot,
  previousMembershipByZoneId,
}: EvaluateGeofenceStateOptions): EvaluateGeofenceStateResult {
  const previousShipsById = new Map(
    previousSnapshot.ships.map((ship) => [ship.shipId, ship] as const)
  );
  const createdAlerts: FleetAlert[] = [];
  const membershipByZoneId = new Map<string, Set<string>>();

  for (const zone of nextSnapshot.zones) {
    const previousMembership = previousMembershipByZoneId.get(zone.id) ?? new Set<string>();
    const currentMembership = new Set<string>();

    for (const ship of nextSnapshot.ships) {
      const isInsideZone = isPointInsidePolygon(ship.position, zone.points);

      if (isInsideZone) {
        currentMembership.add(ship.shipId);
      }

      const previousShip = previousShipsById.get(ship.shipId);
      const crossedIntoZone = previousShip
        ? didSegmentEnterPolygon(previousShip.position, ship.position, zone.points)
        : isInsideZone;
      const enteredZone = !previousMembership.has(ship.shipId) && (isInsideZone || crossedIntoZone);

      if (
        !enteredZone ||
        hasOpenGeofenceAlert([...createdAlerts, ...nextSnapshot.alerts], zone.id, ship.shipId)
      ) {
        continue;
      }

      createdAlerts.push(createGeofenceAlert(zone.id, zone.name, ship, nextSnapshot.generatedAt));
    }

    membershipByZoneId.set(zone.id, currentMembership);
  }

  const reroutingShipIds = new Set<string>();

  for (const shipIds of membershipByZoneId.values()) {
    for (const shipId of shipIds) {
      reroutingShipIds.add(shipId);
    }
  }

  const ships = nextSnapshot.ships.map<FleetShipRuntimeSnapshot>((ship) => ({
    ...ship,
    status: resolveZoneStatus(ship, reroutingShipIds.has(ship.shipId)),
  }));

  return {
    nextSnapshot: {
      ...nextSnapshot,
      ships,
      alerts: [...createdAlerts, ...nextSnapshot.alerts],
    },
    membershipByZoneId,
  };
}
