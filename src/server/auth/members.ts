import { and, eq, inArray, not } from "drizzle-orm";

import { getAuthDb } from "@/server/auth/db";
import { sendAuthActionEmail } from "@/server/auth/email";
import { ensureAuthFoundation } from "@/server/auth/foundation";
import { createId, createOpaqueToken, hashPassword } from "@/server/auth/password";
import {
  captainShipAssignments,
  fleetShipRegistry,
  memberRoles,
  userProfiles,
  users,
} from "@/server/auth/schema";
import { writeAuditLog } from "@/server/auth/audit";
import { authUserStatusValues, verificationKindValues } from "@/server/auth/constants";
import { createVerificationToken } from "@/server/auth/tokens";
import type { AuthRole } from "@/server/auth/session";

export type AdminMemberRecord = {
  userId: string;
  email: string;
  fullName: string;
  status: string;
  emailVerifiedAt: string | null;
  roles: AuthRole[];
  captainShipIds: string[];
  createdAt: string;
};

async function requireAuthDb() {
  await ensureAuthFoundation();

  const db = getAuthDb();

  if (!db) {
    throw new Error("Authentication database is not configured.");
  }

  return db;
}

async function assertCaptainShipAvailable(shipId: string, excludedUserId?: string) {
  const db = await requireAuthDb();
  const query = db
    .select({ userId: captainShipAssignments.userId })
    .from(captainShipAssignments)
    .where(
      excludedUserId
        ? and(
            eq(captainShipAssignments.shipId, shipId),
            not(eq(captainShipAssignments.userId, excludedUserId))
          )
        : eq(captainShipAssignments.shipId, shipId)
    )
    .limit(1);
  const [existingAssignment] = await query;

  if (existingAssignment) {
    throw new Error("That ship is already assigned to another captain.");
  }
}

export async function listFleetShipRegistry() {
  const db = await requireAuthDb();

  return db
    .select({
      shipId: fleetShipRegistry.shipId,
      name: fleetShipRegistry.name,
      cargo: fleetShipRegistry.cargo,
    })
    .from(fleetShipRegistry);
}

export async function listAdminMembers(): Promise<AdminMemberRecord[]> {
  const db = await requireAuthDb();
  const baseUsers = await db
    .select({
      userId: users.id,
      email: users.email,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      createdAt: users.createdAt,
      fullName: userProfiles.fullName,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id));

  const userIds = baseUsers.map((entry) => entry.userId);
  const roles = userIds.length
    ? await db
        .select({ userId: memberRoles.userId, role: memberRoles.role })
        .from(memberRoles)
        .where(inArray(memberRoles.userId, userIds))
    : [];
  const assignments = userIds.length
    ? await db
        .select({ userId: captainShipAssignments.userId, shipId: captainShipAssignments.shipId })
        .from(captainShipAssignments)
        .where(inArray(captainShipAssignments.userId, userIds))
    : [];

  return baseUsers.map((user) => ({
    userId: user.userId,
    email: user.email,
    fullName: user.fullName ?? user.email,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    roles: roles
      .filter((entry) => entry.userId === user.userId)
      .map((entry) => entry.role as AuthRole),
    captainShipIds: assignments
      .filter((entry) => entry.userId === user.userId)
      .map((entry) => entry.shipId),
  }));
}

export async function createInvitedMember(input: {
  actorUserId: string;
  fullName: string;
  email: string;
  role: AuthRole;
  captainShipId?: string | null;
  appBaseUrl: string;
}) {
  const db = await requireAuthDb();
  const normalizedEmail = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingUser) {
    throw new Error("A member with that email already exists.");
  }

  if (input.role === "captain") {
    if (!input.captainShipId) {
      throw new Error("Captain members must be assigned to a ship.");
    }

    await assertCaptainShipAvailable(input.captainShipId);
  }

  const userId = createId("usr");
  await db.insert(users).values({
    id: userId,
    email: normalizedEmail,
    passwordHash: hashPassword(createOpaqueToken()),
    status: authUserStatusValues.invited,
    emailVerifiedAt: null,
  });
  await db.insert(userProfiles).values({
    userId,
    fullName: fullName || normalizedEmail,
  });
  await db.insert(memberRoles).values({
    id: createId("role"),
    userId,
    role: input.role,
  });

  if (input.role === "captain" && input.captainShipId) {
    await db.insert(captainShipAssignments).values({
      id: createId("assign"),
      userId,
      shipId: input.captainShipId,
    });
  }

  const invite = await createVerificationToken({
    identifier: userId,
    kind: verificationKindValues.memberInvite,
    ttlHours: 72,
  });
  const inviteUrl = `${input.appBaseUrl}/auth/invite?token=${encodeURIComponent(invite.token)}`;
  const preview = await sendAuthActionEmail({
    to: normalizedEmail,
    subject: "Fleet Crisis Ops invitation",
    actionLabel: "Accept invitation",
    actionUrl: inviteUrl,
    summary: `Your ${input.role} account is ready for first-time setup.`,
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "member.invite.created",
    targetType: "user",
    targetId: userId,
    metadata: { email: normalizedEmail, role: input.role },
  });

  return {
    userId,
    inviteUrl: preview.previewUrl ?? inviteUrl,
  };
}

export async function updateMemberAccess(input: {
  actorUserId: string;
  userId: string;
  role: AuthRole;
  captainShipId?: string | null;
}) {
  const db = await requireAuthDb();

  if (input.actorUserId === input.userId) {
    throw new Error("Use a separate admin account before changing your own role.");
  }

  if (input.role === "captain") {
    if (!input.captainShipId) {
      throw new Error("Captain members must keep a ship assignment.");
    }

    await assertCaptainShipAvailable(input.captainShipId, input.userId);
  }

  await db.delete(memberRoles).where(eq(memberRoles.userId, input.userId));
  await db.insert(memberRoles).values({
    id: createId("role"),
    userId: input.userId,
    role: input.role,
  });
  await db.delete(captainShipAssignments).where(eq(captainShipAssignments.userId, input.userId));

  if (input.role === "captain" && input.captainShipId) {
    await db.insert(captainShipAssignments).values({
      id: createId("assign"),
      userId: input.userId,
      shipId: input.captainShipId,
    });
  }

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "member.access.updated",
    targetType: "user",
    targetId: input.userId,
    metadata: { role: input.role, captainShipId: input.captainShipId ?? null },
  });
}

export async function toggleMemberStatus(input: { actorUserId: string; userId: string }) {
  const db = await requireAuthDb();

  if (input.actorUserId === input.userId) {
    throw new Error("Use a separate admin account before disabling yourself.");
  }

  const [user] = await db
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (!user) {
    throw new Error("Member not found.");
  }

  const nextStatus =
    user.status === authUserStatusValues.disabled
      ? authUserStatusValues.active
      : authUserStatusValues.disabled;

  await db
    .update(users)
    .set({ status: nextStatus, updatedAt: new Date().toISOString() })
    .where(eq(users.id, input.userId));

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "member.status.updated",
    targetType: "user",
    targetId: input.userId,
    metadata: { status: nextStatus },
  });

  return nextStatus;
}
