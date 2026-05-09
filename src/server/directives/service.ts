import { randomUUID } from "node:crypto";

import { getFleetScenarioSeed } from "@/features/fleet/data/scenario-seed";
import { bearingBetweenPoints } from "@/lib/geo/navigation";
import type { FleetAlert } from "@/types/alerts";
import type { DistressAssessment } from "@/types/distress";
import type { CaptainResponse, DirectiveType, FleetDirective } from "@/types/directives";
import type { ShipStatus } from "@/types/fleet";
import type { PlaybackEvent } from "@/types/playback";
import type { FleetRuntimeSnapshot, FleetShipRuntimeSnapshot } from "@/types/realtime";

const EVENT_LIMIT = 20;
const scenarioSeed = getFleetScenarioSeed();
const portLookup = new Map(scenarioSeed.ports.map((port) => [port.id, port]));
const shipSeedLookup = new Map(scenarioSeed.ships.map((ship) => [ship.shipId, ship]));
const stickyStatuses = new Set<ShipStatus>([
  "arrived",
  "distressed",
  "insufficient-fuel",
  "out-of-fuel",
  "rerouting",
  "stranded",
]);

export type IssueDirectiveInput = {
  shipId: string;
  type: DirectiveType;
  targetPortId?: string;
  waypoint?: FleetDirective["waypoint"];
  note?: string;
};

function appendRecentEvent(snapshot: FleetRuntimeSnapshot, event: Omit<PlaybackEvent, "id">) {
  return [{ id: randomUUID(), ...event }, ...snapshot.events].slice(0, EVENT_LIMIT);
}

function resolveDirectiveTargetSummary(directive: IssueDirectiveInput | FleetDirective) {
  if (directive.type === "reroute-port") {
    const portName = directive.targetPortId ? portLookup.get(directive.targetPortId)?.name : null;
    return portName ?? directive.targetPortId ?? "alternate port";
  }

  if (directive.type === "divert-waypoint" && directive.waypoint) {
    return `${directive.waypoint.lat.toFixed(3)}, ${directive.waypoint.lng.toFixed(3)}`;
  }

  return "current position";
}

function resolveShipName(snapshot: FleetRuntimeSnapshot, shipId: string) {
  return snapshot.ships.find((ship) => ship.shipId === shipId)?.name ?? shipId;
}

function getCruiseSpeedKnots(ship: FleetShipRuntimeSnapshot) {
  return ship.speedKnots > 0
    ? ship.speedKnots
    : (shipSeedLookup.get(ship.shipId)?.speedKnots ?? 12);
}

function resolveAppliedStatus(ship: FleetShipRuntimeSnapshot, nextSpeedKnots: number) {
  if (stickyStatuses.has(ship.status)) {
    return ship.status;
  }

  return nextSpeedKnots > 0 ? "normal" : "stopped";
}

function createDirectiveEvent(
  kind: PlaybackEvent["kind"],
  directive: FleetDirective,
  shipName: string,
  summaryPrefix: string,
  occurredAt: string,
  severity?: PlaybackEvent["severity"]
): Omit<PlaybackEvent, "id"> {
  return {
    kind,
    occurredAt,
    shipIds: [directive.shipId],
    summary: `${summaryPrefix} ${shipName} (${resolveDirectiveTargetSummary(directive)})`,
    severity,
  };
}

function createDistressAlert(
  snapshot: FleetRuntimeSnapshot,
  directive: FleetDirective,
  response: CaptainResponse
): FleetAlert {
  const shipName = resolveShipName(snapshot, directive.shipId);
  const summary = response.distressAssessment?.summary ?? "distress escalation received";
  const quantifiedImpact = response.distressAssessment?.quantifiedImpact;

  return {
    id: randomUUID(),
    source: "distress",
    severity: response.distressAssessment?.severity ?? "warning",
    state: "active",
    title: `${shipName} escalated distress`,
    message: quantifiedImpact ? `${summary}. Impact: ${quantifiedImpact}.` : `${summary}.`,
    affectedShipIds: [directive.shipId],
    createdAt: response.respondedAt,
    metadata: {
      directiveId: directive.id,
      issueType: response.distressAssessment?.issueType ?? "unknown",
      quantifiedImpact: quantifiedImpact ?? null,
      provider: response.distressAssessment?.provider ?? "local",
    },
  };
}

export function issueDirective(
  snapshot: FleetRuntimeSnapshot,
  input: IssueDirectiveInput,
  issuedAt = new Date().toISOString()
) {
  if (!snapshot.ships.some((ship) => ship.shipId === input.shipId)) {
    return null;
  }

  if (
    input.type === "reroute-port" &&
    (!input.targetPortId || !portLookup.has(input.targetPortId))
  ) {
    return null;
  }

  if (input.type === "divert-waypoint" && !input.waypoint) {
    return null;
  }

  const directive: FleetDirective = {
    id: randomUUID(),
    shipId: input.shipId,
    type: input.type,
    issuedAt,
    issuedBy: "command",
    status: "pending",
    targetPortId: input.targetPortId,
    waypoint: input.waypoint,
    note: input.note?.trim() || undefined,
  };
  const shipName = resolveShipName(snapshot, directive.shipId);

  return {
    ...snapshot,
    directives: [directive, ...snapshot.directives],
    events: appendRecentEvent(
      snapshot,
      createDirectiveEvent("directive", directive, shipName, "Command sent directive to", issuedAt)
    ),
  };
}

export function acceptDirective(
  snapshot: FleetRuntimeSnapshot,
  directiveId: string,
  respondedAt = new Date().toISOString()
) {
  const directive = snapshot.directives.find((entry) => entry.id === directiveId);

  if (!directive || directive.status !== "pending") {
    return null;
  }

  const response: CaptainResponse = {
    id: randomUUID(),
    directiveId,
    shipId: directive.shipId,
    response: "accept",
    respondedAt,
  };
  const shipName = resolveShipName(snapshot, directive.shipId);

  return {
    ...snapshot,
    directives: snapshot.directives.map<FleetDirective>((entry) =>
      entry.id === directiveId
        ? {
            ...entry,
            status: "accepted",
            captainResponseId: response.id,
          }
        : entry
    ),
    captainResponses: [response, ...snapshot.captainResponses],
    events: appendRecentEvent(
      snapshot,
      createDirectiveEvent(
        "response",
        directive,
        shipName,
        "Captain accepted directive for",
        respondedAt
      )
    ),
  };
}

export function escalateDirective(
  snapshot: FleetRuntimeSnapshot,
  directiveId: string,
  distressMessage: string,
  distressAssessment: DistressAssessment,
  respondedAt = new Date().toISOString()
) {
  const directive = snapshot.directives.find((entry) => entry.id === directiveId);

  if (!directive || directive.status !== "pending") {
    return null;
  }

  const response: CaptainResponse = {
    id: randomUUID(),
    directiveId,
    shipId: directive.shipId,
    response: "escalate-distress",
    respondedAt,
    distressMessage: distressMessage.trim(),
    distressAssessment,
  };
  const shipName = resolveShipName(snapshot, directive.shipId);
  const alert = createDistressAlert(snapshot, directive, response);

  return {
    ...snapshot,
    ships: snapshot.ships.map<FleetShipRuntimeSnapshot>((ship) =>
      ship.shipId === directive.shipId
        ? {
            ...ship,
            status: "distressed",
          }
        : ship
    ),
    directives: snapshot.directives.map<FleetDirective>((entry) =>
      entry.id === directiveId
        ? {
            ...entry,
            status: "escalated",
            captainResponseId: response.id,
          }
        : entry
    ),
    captainResponses: [response, ...snapshot.captainResponses],
    alerts: [alert, ...snapshot.alerts],
    events: appendRecentEvent(snapshot, {
      kind: "response",
      occurredAt: respondedAt,
      shipIds: [directive.shipId],
      summary: `Captain escalated distress for ${shipName}: ${distressAssessment.summary}`,
      severity: distressAssessment.severity,
    }),
  };
}

export function applyAcceptedDirectivesToSnapshot(
  snapshot: FleetRuntimeSnapshot,
  appliedAt = new Date().toISOString()
) {
  const pendingAcceptedDirectives = snapshot.directives.filter(
    (directive) => directive.status === "accepted" && !directive.appliedAt
  );

  if (pendingAcceptedDirectives.length === 0) {
    return snapshot;
  }

  const directivesByShipId = new Map<string, FleetDirective>();

  for (const directive of pendingAcceptedDirectives) {
    if (!directivesByShipId.has(directive.shipId)) {
      directivesByShipId.set(directive.shipId, directive);
    }
  }

  return {
    ...snapshot,
    ships: snapshot.ships.map<FleetShipRuntimeSnapshot>((ship) => {
      const directive = directivesByShipId.get(ship.shipId);

      if (!directive) {
        return ship;
      }

      if (directive.type === "hold-position") {
        return {
          ...ship,
          speedKnots: 0,
          intent: { type: "hold-position" },
          status: resolveAppliedStatus(ship, 0),
        };
      }

      if (directive.type === "divert-waypoint" && directive.waypoint) {
        const nextSpeedKnots = getCruiseSpeedKnots(ship);

        return {
          ...ship,
          speedKnots: nextSpeedKnots,
          headingDegrees: bearingBetweenPoints(ship.position, directive.waypoint),
          intent: {
            type: "waypoint",
            waypoint: directive.waypoint,
          },
          status: resolveAppliedStatus(ship, nextSpeedKnots),
        };
      }

      if (directive.type === "reroute-port" && directive.targetPortId) {
        const targetPort = portLookup.get(directive.targetPortId);

        if (!targetPort) {
          return ship;
        }

        const nextSpeedKnots = getCruiseSpeedKnots(ship);

        return {
          ...ship,
          speedKnots: nextSpeedKnots,
          destinationPortId: directive.targetPortId,
          headingDegrees: bearingBetweenPoints(ship.position, targetPort.position),
          intent: {
            type: "destination-port",
            portId: directive.targetPortId,
          },
          status: resolveAppliedStatus(ship, nextSpeedKnots),
        };
      }

      return ship;
    }),
    directives: snapshot.directives.map<FleetDirective>((directive) =>
      directive.status === "accepted" && !directive.appliedAt
        ? {
            ...directive,
            appliedAt,
          }
        : directive
    ),
  };
}
