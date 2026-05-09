import { desc, inArray } from "drizzle-orm";

import { createId } from "@/server/auth/password";
import { auditLogs, userProfiles } from "@/server/auth/schema";
import { getAuthDb } from "@/server/auth/db";
import { ensureAuthFoundation } from "@/server/auth/foundation";

export type AuditLogRecord = {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, string | number | boolean | null> | null;
  createdAt: string;
};

export async function writeAuditLog(input: {
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}) {
  await ensureAuthFoundation();

  const db = getAuthDb();

  if (!db) {
    return;
  }

  await db.insert(auditLogs).values({
    id: createId("audit"),
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? null,
  });
}

export async function listRecentAuditLogs(limit = 20): Promise<AuditLogRecord[]> {
  await ensureAuthFoundation();

  const db = getAuthDb();

  if (!db) {
    return [];
  }

  const entries = await db
    .select({
      id: auditLogs.id,
      actorUserId: auditLogs.actorUserId,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  const actorUserIds = [
    ...new Set(
      entries.map((entry) => entry.actorUserId).filter((value): value is string => Boolean(value))
    ),
  ];
  const actorProfiles =
    actorUserIds.length > 0
      ? await db
          .select({ userId: userProfiles.userId, fullName: userProfiles.fullName })
          .from(userProfiles)
          .where(inArray(userProfiles.userId, actorUserIds))
      : [];
  const actorNameByUserId = new Map(
    actorProfiles.map((profile) => [profile.userId, profile.fullName] as const)
  );

  return entries.map((entry) => ({
    ...entry,
    metadata: (entry.metadata ?? null) as Record<string, string | number | boolean | null> | null,
    actorName: entry.actorUserId ? (actorNameByUserId.get(entry.actorUserId) ?? null) : null,
  }));
}
