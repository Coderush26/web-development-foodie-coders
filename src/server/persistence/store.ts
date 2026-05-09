import { desc } from "drizzle-orm";

import { ensureAuthFoundation } from "@/server/auth/foundation";
import { getAuthDb } from "@/server/auth/db";
import { alerts, directiveResponses, directives, restrictedZones } from "@/server/auth/schema";
import type { FleetRuntimeSnapshot } from "@/types/realtime";

import {
  getOperationalPersistenceSlices,
  type PersistedOperationalState,
} from "@/server/persistence/state";

async function requirePersistenceDb() {
  await ensureAuthFoundation();

  const db = getAuthDb();

  if (!db) {
    return null;
  }

  return db;
}

export async function loadOperationalState(): Promise<PersistedOperationalState | null> {
  const db = await requirePersistenceDb();

  if (!db) {
    return null;
  }

  const [zones, persistedDirectives, persistedResponses, persistedAlerts] = await Promise.all([
    db.select().from(restrictedZones).orderBy(desc(restrictedZones.createdAt)),
    db.select().from(directives).orderBy(desc(directives.issuedAt)),
    db.select().from(directiveResponses).orderBy(desc(directiveResponses.respondedAt)),
    db.select().from(alerts).orderBy(desc(alerts.createdAt)),
  ]);

  return {
    zones,
    directives: persistedDirectives.map((directive) => ({
      ...directive,
      waypoint: directive.waypoint ?? undefined,
      targetPortId: directive.targetPortId ?? undefined,
      note: directive.note ?? undefined,
      captainResponseId: directive.captainResponseId ?? undefined,
      appliedAt: directive.appliedAt ?? undefined,
      issuedBy: directive.issuedBy as "command",
      type: directive.type as "reroute-port" | "divert-waypoint" | "hold-position",
      status: directive.status as "pending" | "accepted" | "escalated",
    })),
    captainResponses: persistedResponses.map((response) => ({
      ...response,
      distressMessage: response.distressMessage ?? undefined,
      distressAssessment: response.distressAssessment ?? undefined,
      response: response.response as "accept" | "escalate-distress",
    })),
    alerts: persistedAlerts.map((alert) => ({
      ...alert,
      acknowledgedAt: alert.acknowledgedAt ?? undefined,
      resolvedAt: alert.resolvedAt ?? undefined,
      metadata: alert.metadata ?? undefined,
      source: alert.source as "geofence" | "proximity" | "weather" | "distress" | "system",
      severity: alert.severity as "info" | "warning" | "critical",
      state: alert.state as "active" | "acknowledged" | "resolved",
    })),
  };
}

export async function persistOperationalState(snapshot: FleetRuntimeSnapshot) {
  const db = await requirePersistenceDb();

  if (!db) {
    return;
  }

  const slices = getOperationalPersistenceSlices(snapshot);

  await db.transaction(async (tx) => {
    await tx.delete(directiveResponses);
    await tx.delete(directives);
    await tx.delete(alerts);
    await tx.delete(restrictedZones);

    if (slices.zones.length > 0) {
      await tx.insert(restrictedZones).values(slices.zones);
    }

    if (slices.directives.length > 0) {
      await tx.insert(directives).values(
        slices.directives.map((directive) => ({
          ...directive,
          waypoint: directive.waypoint ?? null,
          targetPortId: directive.targetPortId ?? null,
          note: directive.note ?? null,
          captainResponseId: directive.captainResponseId ?? null,
          appliedAt: directive.appliedAt ?? null,
        }))
      );
    }

    if (slices.captainResponses.length > 0) {
      await tx.insert(directiveResponses).values(
        slices.captainResponses.map((response) => ({
          ...response,
          distressMessage: response.distressMessage ?? null,
          distressAssessment: response.distressAssessment ?? null,
        }))
      );
    }

    if (slices.alerts.length > 0) {
      await tx.insert(alerts).values(
        slices.alerts.map((alert) => ({
          ...alert,
          acknowledgedAt: alert.acknowledgedAt ?? null,
          resolvedAt: alert.resolvedAt ?? null,
          metadata: alert.metadata ?? null,
          updatedAt: snapshot.generatedAt,
        }))
      );
    }
  });
}
