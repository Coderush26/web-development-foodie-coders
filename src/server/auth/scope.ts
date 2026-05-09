import { haversineDistanceKm } from "@/lib/geo/navigation";
import type { FleetRuntimeSnapshot } from "@/types/realtime";

import type { AuthSessionIdentity } from "@/server/auth/session";
import { hasAnyRole } from "@/server/auth/access";

const CAPTAIN_NEARBY_SHIP_LIMIT = 4;

export function scopeFleetSnapshotForSession(
  snapshot: FleetRuntimeSnapshot,
  session: AuthSessionIdentity | null,
  requestedShipId?: string | null
) {
  if (!session || hasAnyRole(session, ["super_admin", "command"])) {
    return snapshot;
  }

  if (!session.roles.includes("captain")) {
    return null;
  }

  const focusShipId = requestedShipId ?? session.captainShipIds[0] ?? null;

  if (!focusShipId || !session.captainShipIds.includes(focusShipId)) {
    return null;
  }

  const focusShip = snapshot.ships.find((ship) => ship.shipId === focusShipId);

  if (!focusShip) {
    return null;
  }

  const nearbyShipIds = snapshot.ships
    .filter((ship) => ship.shipId !== focusShipId)
    .map((ship) => ({
      shipId: ship.shipId,
      distanceKm: haversineDistanceKm(focusShip.position, ship.position),
    }))
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, CAPTAIN_NEARBY_SHIP_LIMIT)
    .map((ship) => ship.shipId);
  const visibleShipIds = new Set([focusShipId, ...nearbyShipIds]);

  return {
    ...snapshot,
    ships: snapshot.ships.filter((ship) => visibleShipIds.has(ship.shipId)),
    alerts: snapshot.alerts.filter(
      (alert) => alert.affectedShipIds.length === 0 || alert.affectedShipIds.includes(focusShipId)
    ),
    directives: snapshot.directives.filter((directive) => directive.shipId === focusShipId),
    captainResponses: snapshot.captainResponses.filter(
      (response) => response.shipId === focusShipId
    ),
    events: snapshot.events.filter(
      (event) => event.shipIds.length === 0 || event.shipIds.includes(focusShipId)
    ),
  };
}
