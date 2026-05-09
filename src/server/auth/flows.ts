import { eq } from "drizzle-orm";

import { getAuthDb } from "@/server/auth/db";
import { sendAuthActionEmail } from "@/server/auth/email";
import { ensureAuthFoundation } from "@/server/auth/foundation";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { userProfiles, users } from "@/server/auth/schema";
import { writeAuditLog } from "@/server/auth/audit";
import { authUserStatusValues, verificationKindValues } from "@/server/auth/constants";
import {
  consumeVerificationToken,
  createVerificationToken,
  peekVerificationToken,
} from "@/server/auth/tokens";

async function requireAuthDb() {
  await ensureAuthFoundation();

  const db = getAuthDb();

  if (!db) {
    throw new Error("Authentication database is not configured.");
  }

  return db;
}

async function loadUser(userId: string) {
  const db = await requireAuthDb();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      status: users.status,
      passwordHash: users.passwordHash,
      emailVerifiedAt: users.emailVerifiedAt,
      fullName: userProfiles.fullName,
    })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function peekInvite(token: string) {
  const record = await peekVerificationToken({
    token,
    kind: verificationKindValues.memberInvite,
  });

  return record ? loadUser(record.identifier) : null;
}

export async function acceptInvite(input: {
  token: string;
  fullName: string;
  password: string;
  appBaseUrl: string;
}) {
  const record = await consumeVerificationToken({
    token: input.token,
    kind: verificationKindValues.memberInvite,
  });

  if (!record) {
    return null;
  }

  const db = await requireAuthDb();
  const user = await loadUser(record.identifier);

  if (!user || user.status === authUserStatusValues.disabled) {
    return null;
  }

  await db
    .update(users)
    .set({
      passwordHash: hashPassword(input.password),
      status: authUserStatusValues.active,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, record.identifier));
  await db
    .update(userProfiles)
    .set({
      fullName: input.fullName.trim() || user.fullName || user.email,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(userProfiles.userId, record.identifier));

  const verification = await createVerificationToken({
    identifier: record.identifier,
    kind: verificationKindValues.emailVerify,
    ttlHours: 24,
  });
  const verifyUrl = `${input.appBaseUrl}/auth/verify-email?token=${encodeURIComponent(verification.token)}`;
  const preview = await sendAuthActionEmail({
    to: user.email,
    subject: "Verify your Fleet Crisis Ops email",
    actionLabel: "Verify email",
    actionUrl: verifyUrl,
    summary: "Finish account activation by verifying this email address.",
  });

  await writeAuditLog({
    actorUserId: record.identifier,
    action: "member.invite.accepted",
    targetType: "user",
    targetId: record.identifier,
  });

  return {
    email: user.email,
    verifyUrl: preview.previewUrl ?? verifyUrl,
  };
}

export async function verifyEmail(token: string) {
  const record = await consumeVerificationToken({
    token,
    kind: verificationKindValues.emailVerify,
  });

  if (!record) {
    return null;
  }

  const db = await requireAuthDb();
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(users.id, record.identifier));
  await writeAuditLog({
    actorUserId: record.identifier,
    action: "member.email.verified",
    targetType: "user",
    targetId: record.identifier,
  });

  return record.identifier;
}

export async function requestPasswordReset(input: { email: string; appBaseUrl: string }) {
  const db = await requireAuthDb();
  const normalizedEmail = input.email.trim().toLowerCase();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user || user.status !== authUserStatusValues.active || !user.emailVerifiedAt) {
    return null;
  }

  const reset = await createVerificationToken({
    identifier: user.id,
    kind: verificationKindValues.passwordReset,
    ttlHours: 2,
  });
  const resetUrl = `${input.appBaseUrl}/auth/reset-password?token=${encodeURIComponent(reset.token)}`;
  const preview = await sendAuthActionEmail({
    to: user.email,
    subject: "Reset your Fleet Crisis Ops password",
    actionLabel: "Reset password",
    actionUrl: resetUrl,
    summary: "Use this one-time link to set a new password.",
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "member.password.reset.requested",
    targetType: "user",
    targetId: user.id,
  });

  return preview.previewUrl ?? resetUrl;
}

export async function peekPasswordReset(token: string) {
  const record = await peekVerificationToken({
    token,
    kind: verificationKindValues.passwordReset,
  });

  return record ? loadUser(record.identifier) : null;
}

export async function resetPassword(token: string, nextPassword: string) {
  const record = await consumeVerificationToken({
    token,
    kind: verificationKindValues.passwordReset,
  });

  if (!record) {
    return null;
  }

  const db = await requireAuthDb();
  await db
    .update(users)
    .set({ passwordHash: hashPassword(nextPassword), updatedAt: new Date().toISOString() })
    .where(eq(users.id, record.identifier));
  await writeAuditLog({
    actorUserId: record.identifier,
    action: "member.password.reset.completed",
    targetType: "user",
    targetId: record.identifier,
  });

  return record.identifier;
}

export async function changePassword(input: {
  userId: string;
  currentPassword: string;
  nextPassword: string;
}) {
  const user = await loadUser(input.userId);

  if (!user || !verifyPassword(input.currentPassword, user.passwordHash)) {
    return false;
  }

  const db = await requireAuthDb();
  await db
    .update(users)
    .set({ passwordHash: hashPassword(input.nextPassword), updatedAt: new Date().toISOString() })
    .where(eq(users.id, input.userId));
  await writeAuditLog({
    actorUserId: input.userId,
    action: "member.password.changed",
    targetType: "user",
    targetId: input.userId,
  });

  return true;
}
