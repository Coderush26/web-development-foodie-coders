import { randomUUID } from "node:crypto";

import { haversineDistanceKm } from "@/lib/geo/navigation";
import type { FleetAlert } from "@/types/alerts";
import type { FleetShipRuntimeSnapshot, FleetRuntimeSnapshot } from "@/types/realtime";

const PROXIMITY_THRESHOLD_KM = 2;

function resolveAlert(alert: FleetAlert, generatedAt: string): FleetAlert {
  if (alert.state === "resolved") {
    return alert;
  }

  return {
    ...alert,
    state: "resolved",
    acknowledgedAt: alert.acknowledgedAt ?? generatedAt,
    resolvedAt: generatedAt,
  };
}

function hasOpenOperationalAlert(
  alerts: FleetAlert[],
  kind: string,
  shipId: string,
  pairKey?: string
) {
  return alerts.some(
    (alert) =>
      alert.state !== "resolved" &&
      alert.metadata?.kind === kind &&
      (pairKey ? alert.metadata?.pairKey === pairKey : alert.metadata?.shipId === shipId)
  );
}

function createStrandedAlert(ship: FleetShipRuntimeSnapshot, generatedAt: string): FleetAlert {
  return {
    id: randomUUID(),
    source: "system",
    severity: "critical",
    state: "active",
    title: `${ship.name} has no valid route`,
    message: `${ship.name} cannot reach the current target without leaving navigable water or crossing a restricted zone.`,
    affectedShipIds: [ship.shipId],
    createdAt: generatedAt,
    metadata: {
      kind: "stranded",
      shipId: ship.shipId,
      routeReason: ship.routePlan.reason,
    },
  };
}

function createInsufficientFuelAlert(
  ship: FleetShipRuntimeSnapshot,
  generatedAt: string
): FleetAlert {
  return {
    id: randomUUID(),
    source: "system",
    severity: "warning",
    state: "active",
    title: `${ship.name} cannot complete the planned route`,
    message: `${ship.name} is projected to need ${ship.routePlan.estimatedFuelRequiredTons.toFixed(1)} tons but only has ${ship.fuelTons.toFixed(1)} tons remaining.`,
    affectedShipIds: [ship.shipId],
    createdAt: generatedAt,
    metadata: {
      kind: "insufficient-fuel",
      shipId: ship.shipId,
      estimatedFuelRequiredTons: Number(ship.routePlan.estimatedFuelRequiredTons.toFixed(2)),
      fuelTons: Number(ship.fuelTons.toFixed(2)),
    },
  };
}

function createProximityAlert(
  left: FleetShipRuntimeSnapshot,
  right: FleetShipRuntimeSnapshot,
  distanceKm: number,
  generatedAt: string
): FleetAlert {
  const pairKey = [left.shipId, right.shipId].sort().join("::");

  return {
    id: randomUUID(),
    source: "proximity",
    severity: "warning",
    state: "active",
    title: `Proximity warning: ${left.name} and ${right.name}`,
    message: `${left.name} and ${right.name} are only ${distanceKm.toFixed(2)} km apart.`,
    affectedShipIds: [left.shipId, right.shipId],
    createdAt: generatedAt,
    metadata: {
      kind: "proximity",
      pairKey,
      shipId: left.shipId,
      otherShipId: right.shipId,
      distanceKm: Number(distanceKm.toFixed(2)),
    },
  };
}

function syncShipConditionAlert(
  alerts: FleetAlert[],
  ship: FleetShipRuntimeSnapshot,
  kind: "stranded" | "insufficient-fuel",
  generatedAt: string
) {
  const shouldBeOpen = ship.status === kind;

  if (shouldBeOpen) {
    return hasOpenOperationalAlert(alerts, kind, ship.shipId)
      ? alerts
      : [
          kind === "stranded"
            ? createStrandedAlert(ship, generatedAt)
            : createInsufficientFuelAlert(ship, generatedAt),
          ...alerts,
        ];
  }

  return alerts.map((alert) =>
    alert.metadata?.kind === kind && alert.metadata?.shipId === ship.shipId
      ? resolveAlert(alert, generatedAt)
      : alert
  );
}

function syncProximityAlerts(
  alerts: FleetAlert[],
  ships: FleetShipRuntimeSnapshot[],
  generatedAt: string
) {
  const activePairKeys = new Set<string>();
  let nextAlerts = alerts;

  for (let leftIndex = 0; leftIndex < ships.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < ships.length; rightIndex += 1) {
      const left = ships[leftIndex];
      const right = ships[rightIndex];
      const distanceKm = haversineDistanceKm(left.position, right.position);

      if (distanceKm >= PROXIMITY_THRESHOLD_KM) {
        continue;
      }

      const pairKey = [left.shipId, right.shipId].sort().join("::");
      activePairKeys.add(pairKey);

      if (!hasOpenOperationalAlert(nextAlerts, "proximity", left.shipId, pairKey)) {
        nextAlerts = [createProximityAlert(left, right, distanceKm, generatedAt), ...nextAlerts];
      }
    }
  }

  return nextAlerts.map((alert) =>
    alert.source === "proximity" &&
    alert.state !== "resolved" &&
    typeof alert.metadata?.pairKey === "string" &&
    !activePairKeys.has(alert.metadata.pairKey)
      ? resolveAlert(alert, generatedAt)
      : alert
  );
}

export function evaluateOperationalAlerts(snapshot: FleetRuntimeSnapshot): FleetRuntimeSnapshot {
  const generatedAt = snapshot.generatedAt;
  let alerts = snapshot.alerts;

  for (const ship of snapshot.ships) {
    alerts = syncShipConditionAlert(alerts, ship, "stranded", generatedAt);
    alerts = syncShipConditionAlert(alerts, ship, "insufficient-fuel", generatedAt);
  }

  alerts = syncProximityAlerts(alerts, snapshot.ships, generatedAt);

  return {
    ...snapshot,
    alerts,
  };
}
