import { and, eq, gt } from "drizzle-orm";

import { getAuthDb } from "@/server/auth/db";
import { ensureAuthFoundation } from "@/server/auth/foundation";
import {
  createId,
  createOpaqueToken,
  hashOpaqueToken,
  verifyPassword,
} from "@/server/auth/password";
import {
  captainShipAssignments,
  memberRoles,
  sessions,
  userProfiles,
  users,
} from "@/server/auth/schema";

export type AuthRole = "super_admin" | "command" | "captain";

export type AuthSessionIdentity = {
  userId: string;
  email: string;
  fullName: string;
  roles: AuthRole[];
  captainShipIds: string[];
};

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

async function loadIdentity(userId: string): Promise<AuthSessionIdentity | null> {
  const db = getAuthDb();

  if (!db) {
    return null;
  }

  const [user] = await db
    .select({ id: users.id, email: users.email, status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || user.status !== "active") {
    return null;
  }

  const [profile] = await db
    .select({ fullName: userProfiles.fullName })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  const roles = await db
    .select({ role: memberRoles.role })
    .from(memberRoles)
    .where(eq(memberRoles.userId, userId));

  const assignments = await db
    .select({ shipId: captainShipAssignments.shipId })
    .from(captainShipAssignments)
    .where(eq(captainShipAssignments.userId, userId));

  return {
    userId: user.id,
    email: user.email,
    fullName: profile?.fullName ?? user.email,
    roles: roles.map((entry) => entry.role as AuthRole),
    captainShipIds: assignments.map((entry) => entry.shipId),
  };
}

export async function createSessionForCredentials(input: {
  email: string;
  password: string;
  userAgent?: string | null;
}) {
  await ensureAuthFoundation();

  const db = getAuthDb();

  if (!db) {
    throw new Error("Authentication database is not configured.");
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      status: users.status,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user || user.status !== "active" || !verifyPassword(input.password, user.passwordHash)) {
    return null;
  }

  const token = createOpaqueToken();
  await db.insert(sessions).values({
    id: createId("sess"),
    userId: user.id,
    tokenHash: hashOpaqueToken(token),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    userAgent: input.userAgent ?? null,
  });

  const identity = await loadIdentity(user.id);

  if (!identity) {
    return null;
  }

  return { token, identity };
}

export async function getSessionIdentity(sessionToken: string | undefined | null) {
  if (!sessionToken) {
    return null;
  }

  await ensureAuthFoundation();

  const db = getAuthDb();

  if (!db) {
    return null;
  }

  const tokenHash = hashOpaqueToken(sessionToken);
  const [session] = await db
    .select({ id: sessions.id, userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date().toISOString())))
    .limit(1);

  if (!session) {
    return null;
  }

  await db
    .update(sessions)
    .set({ lastSeenAt: new Date().toISOString() })
    .where(eq(sessions.id, session.id));

  return loadIdentity(session.userId);
}

export async function revokeSession(sessionToken: string | undefined | null) {
  if (!sessionToken) {
    return;
  }

  await ensureAuthFoundation();

  const db = getAuthDb();

  if (!db) {
    return;
  }

  await db.delete(sessions).where(eq(sessions.tokenHash, hashOpaqueToken(sessionToken)));
}
