import { getFleetScenarioSeed } from "@/features/fleet/data/scenario-seed";
import { bearingBetweenPoints } from "@/lib/geo/navigation";
import { isPointInsidePolygon } from "@/lib/geo/polygon";
import type { FleetAlert } from "@/types/alerts";
import type { CaptainResponse, FleetDirective } from "@/types/directives";
import type { RestrictedZone } from "@/types/zones";
import type { FleetRuntimeSnapshot, FleetShipRuntimeSnapshot } from "@/types/realtime";

const scenarioSeed = getFleetScenarioSeed();
const portLookup = new Map(scenarioSeed.ports.map((port) => [port.id, port] as const));
const shipSeedLookup = new Map(scenarioSeed.ships.map((ship) => [ship.shipId, ship] as const));
const persistentStatuses = new Set([
  "arrived",
  "distressed",
  "stranded",
  "insufficient-fuel",
  "out-of-fuel",
  "rerouting",
]);

export type PersistedOperationalState = {
  zones: RestrictedZone[];
  directives: FleetDirective[];
  captainResponses: CaptainResponse[];
  alerts: FleetAlert[];
};

function getCruiseSpeedKnots(ship: FleetShipRuntimeSnapshot) {
  return ship.speedKnots > 0
    ? ship.speedKnots
    : (shipSeedLookup.get(ship.shipId)?.speedKnots ?? 12);
}

function resolveStatus(ship: FleetShipRuntimeSnapshot, nextSpeedKnots: number) {
  return persistentStatuses.has(ship.status)
    ? ship.status
    : nextSpeedKnots > 0
      ? "normal"
      : "stopped";
}

function applyDirectiveEffect(ship: FleetShipRuntimeSnapshot, directive: FleetDirective) {
  if (directive.type === "hold-position") {
    return {
      ...ship,
      speedKnots: 0,
      intent: { type: "hold-position" as const },
      status: resolveStatus(ship, 0),
    };
  }

  if (directive.type === "divert-waypoint" && directive.waypoint) {
    const nextSpeedKnots = getCruiseSpeedKnots(ship);

    return {
      ...ship,
      speedKnots: nextSpeedKnots,
      headingDegrees: bearingBetweenPoints(ship.position, directive.waypoint),
      intent: {
        type: "waypoint" as const,
        waypoint: directive.waypoint,
      },
      status: resolveStatus(ship, nextSpeedKnots),
    };
  }

  if (directive.type === "reroute-port" && directive.targetPortId) {
    const port = portLookup.get(directive.targetPortId);

    if (!port) {
      return ship;
    }

    const nextSpeedKnots = getCruiseSpeedKnots(ship);

    return {
      ...ship,
      speedKnots: nextSpeedKnots,
      destinationPortId: directive.targetPortId,
      headingDegrees: bearingBetweenPoints(ship.position, port.position),
      intent: {
        type: "destination-port" as const,
        portId: directive.targetPortId,
      },
      status: resolveStatus(ship, nextSpeedKnots),
    };
  }

  return ship;
}

function replayDirectiveState(snapshot: FleetRuntimeSnapshot) {
  const directiveTimeline = [...snapshot.directives]
    .filter((directive) => directive.status === "accepted" || directive.status === "escalated")
    .sort(
      (left, right) =>
        Date.parse(left.appliedAt ?? left.issuedAt) - Date.parse(right.appliedAt ?? right.issuedAt)
    );

  if (directiveTimeline.length === 0) {
    return snapshot;
  }

  const ships = snapshot.ships.map((ship) => ({ ...ship }));
  const shipById = new Map(ships.map((ship) => [ship.shipId, ship] as const));

  for (const directive of directiveTimeline) {
    const currentShip = shipById.get(directive.shipId);

    if (!currentShip) {
      continue;
    }

    if (directive.status === "escalated") {
      shipById.set(directive.shipId, {
        ...currentShip,
        status: "distressed",
      });
      continue;
    }

    shipById.set(directive.shipId, applyDirectiveEffect(currentShip, directive));
  }

  return {
    ...snapshot,
    ships: ships.map((ship) => shipById.get(ship.shipId) ?? ship),
  };
}

export function getOperationalPersistenceSlices(
  snapshot: FleetRuntimeSnapshot
): PersistedOperationalState {
  return {
    zones: snapshot.zones,
    directives: snapshot.directives,
    captainResponses: snapshot.captainResponses,
    alerts: snapshot.alerts,
  };
}

export function hasOperationalPersistenceChanges(
  previousSnapshot: FleetRuntimeSnapshot,
  nextSnapshot: FleetRuntimeSnapshot
) {
  return (
    JSON.stringify(getOperationalPersistenceSlices(previousSnapshot)) !==
    JSON.stringify(getOperationalPersistenceSlices(nextSnapshot))
  );
}

export function hydrateOperationalSnapshot(
  baseSnapshot: FleetRuntimeSnapshot,
  persistedState: PersistedOperationalState
) {
  return replayDirectiveState({
    ...baseSnapshot,
    zones: persistedState.zones,
    directives: persistedState.directives,
    captainResponses: persistedState.captainResponses,
    alerts: persistedState.alerts,
  });
}

export function buildZoneMembershipByZoneId(snapshot: FleetRuntimeSnapshot) {
  return new Map(
    snapshot.zones.map((zone) => [
      zone.id,
      new Set(
        snapshot.ships
          .filter((ship) => isPointInsidePolygon(ship.position, zone.points))
          .map((ship) => ship.shipId)
      ),
    ])
  );
}
