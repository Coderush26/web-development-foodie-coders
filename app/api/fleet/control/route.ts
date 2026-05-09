import { NextResponse } from "next/server";

import { extractDistressAssessment } from "@/server/directives/distress-extractor";
import { getFleetRuntime } from "@/server/simulation/runtime";
import type { FleetControlCommand } from "@/types/control";
import type { DirectiveType } from "@/types/directives";
import type { GeoPoint } from "@/types/fleet";
import type { RestrictedZoneDraft } from "@/types/zones";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseGeoPoint(value: unknown): GeoPoint | null {
  if (!isObject(value) || typeof value.lat !== "number" || typeof value.lng !== "number") {
    return null;
  }

  if (!Number.isFinite(value.lat) || !Number.isFinite(value.lng)) {
    return null;
  }

  return {
    lat: value.lat,
    lng: value.lng,
  };
}

function parseZoneDraft(value: unknown): RestrictedZoneDraft | null {
  if (!isObject(value) || !Array.isArray(value.points)) {
    return null;
  }

  const points = value.points.map(parseGeoPoint);

  if (points.some((point) => point === null) || points.length < 3) {
    return null;
  }

  return {
    name: typeof value.name === "string" ? value.name : "",
    points: points.filter((point): point is GeoPoint => point !== null),
  };
}

function isDirectiveType(value: unknown): value is DirectiveType {
  return value === "reroute-port" || value === "divert-waypoint" || value === "hold-position";
}

function parseCommand(value: unknown): FleetControlCommand | null {
  if (!isObject(value) || typeof value.type !== "string") {
    return null;
  }

  if (value.type === "zone.create") {
    const zone = parseZoneDraft(value.zone);
    return zone ? { type: value.type, zone } : null;
  }

  if (value.type === "zone.update") {
    const zone = parseZoneDraft(value.zone);
    return zone && typeof value.zoneId === "string"
      ? { type: value.type, zoneId: value.zoneId, zone }
      : null;
  }

  if (value.type === "zone.delete" && typeof value.zoneId === "string") {
    return {
      type: value.type,
      zoneId: value.zoneId,
    };
  }

  if (value.type === "alert.acknowledge" && typeof value.alertId === "string") {
    return {
      type: value.type,
      alertId: value.alertId,
    };
  }

  if (value.type === "alert.resolve" && typeof value.alertId === "string") {
    return {
      type: value.type,
      alertId: value.alertId,
    };
  }

  if (
    value.type === "directive.issue" &&
    typeof value.shipId === "string" &&
    isDirectiveType(value.directiveType)
  ) {
    const waypoint = value.waypoint === undefined ? undefined : parseGeoPoint(value.waypoint);

    if (value.waypoint !== undefined && !waypoint) {
      return null;
    }

    return {
      type: value.type,
      shipId: value.shipId,
      directiveType: value.directiveType,
      targetPortId: typeof value.targetPortId === "string" ? value.targetPortId : undefined,
      waypoint: waypoint ?? undefined,
      note: typeof value.note === "string" ? value.note : undefined,
    };
  }

  if (value.type === "directive.accept" && typeof value.directiveId === "string") {
    return {
      type: value.type,
      directiveId: value.directiveId,
    };
  }

  if (
    value.type === "directive.escalate-distress" &&
    typeof value.directiveId === "string" &&
    typeof value.distressMessage === "string" &&
    value.distressMessage.trim().length > 0
  ) {
    return {
      type: value.type,
      directiveId: value.directiveId,
      distressMessage: value.distressMessage.trim(),
    };
  }

  return null;
}

export async function POST(request: Request) {
  const value = (await request.json().catch(() => null)) as unknown;
  const command = parseCommand(value);

  if (!command) {
    return NextResponse.json({ message: "Invalid fleet control command." }, { status: 400 });
  }

  const fleetRuntime = getFleetRuntime();
  fleetRuntime.start();

  if (command.type === "zone.create") {
    fleetRuntime.createZone(command.zone);
  }

  if (command.type === "zone.update") {
    const updatedZone = fleetRuntime.updateZone(command.zoneId, command.zone);

    if (!updatedZone) {
      return NextResponse.json({ message: "Restricted zone not found." }, { status: 404 });
    }
  }

  if (command.type === "zone.delete") {
    const removed = fleetRuntime.removeZone(command.zoneId);

    if (!removed) {
      return NextResponse.json({ message: "Restricted zone not found." }, { status: 404 });
    }
  }

  if (command.type === "alert.acknowledge") {
    const alert = fleetRuntime.acknowledgeAlert(command.alertId);

    if (!alert) {
      return NextResponse.json({ message: "Alert not found." }, { status: 404 });
    }
  }

  if (command.type === "alert.resolve") {
    const alert = fleetRuntime.resolveAlert(command.alertId);

    if (!alert) {
      return NextResponse.json({ message: "Alert not found." }, { status: 404 });
    }
  }

  if (command.type === "directive.issue") {
    const snapshot = fleetRuntime.issueDirective({
      shipId: command.shipId,
      type: command.directiveType,
      targetPortId: command.targetPortId,
      waypoint: command.waypoint,
      note: command.note,
    });

    if (!snapshot) {
      return NextResponse.json(
        { message: "Directive target was invalid for the selected ship." },
        { status: 400 }
      );
    }
  }

  if (command.type === "directive.accept") {
    const snapshot = fleetRuntime.acceptDirective(command.directiveId);

    if (!snapshot) {
      return NextResponse.json(
        { message: "Directive not found or already responded to." },
        { status: 404 }
      );
    }
  }

  if (command.type === "directive.escalate-distress") {
    const distressAssessment = await extractDistressAssessment(command.distressMessage);
    const snapshot = fleetRuntime.escalateDirective(
      command.directiveId,
      command.distressMessage,
      distressAssessment
    );

    if (!snapshot) {
      return NextResponse.json(
        { message: "Directive not found or already responded to." },
        { status: 404 }
      );
    }
  }

  return NextResponse.json(
    { snapshot: fleetRuntime.getSnapshot() },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
