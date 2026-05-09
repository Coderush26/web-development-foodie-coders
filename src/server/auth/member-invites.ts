import { eq } from "drizzle-orm";

import { writeAuditLog } from "@/server/auth/audit";
import { authUserStatusValues, verificationKindValues } from "@/server/auth/constants";
import { getAuthDb } from "@/server/auth/db";
import { sendAuthActionEmail } from "@/server/auth/email";
import { ensureAuthFoundation } from "@/server/auth/foundation";
import { createVerificationToken } from "@/server/auth/tokens";
import { users } from "@/server/auth/schema";

export async function resendMemberInvite(input: {
  actorUserId: string;
  userId: string;
  appBaseUrl: string;
}) {
  await ensureAuthFoundation();

  const db = getAuthDb();

  if (!db) {
    throw new Error("Authentication database is not configured.");
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (!user) {
    throw new Error("Member not found.");
  }

  if (user.status === authUserStatusValues.disabled) {
    throw new Error("Reactivate the member before sending a fresh invite.");
  }

  if (user.emailVerifiedAt) {
    throw new Error("This member is already verified. Use password reset instead.");
  }

  const invite = await createVerificationToken({
    identifier: input.userId,
    kind: verificationKindValues.memberInvite,
    ttlHours: 72,
  });
  const inviteUrl = `${input.appBaseUrl}/auth/invite?token=${encodeURIComponent(invite.token)}`;
  const preview = await sendAuthActionEmail({
    to: user.email,
    subject: "Fleet Crisis Ops invitation",
    actionLabel: "Accept invitation",
    actionUrl: inviteUrl,
    summary: "A super admin sent a fresh setup link for your account.",
  });

  await writeAuditLog({
    actorUserId: input.actorUserId,
    action: "member.invite.resent",
    targetType: "user",
    targetId: input.userId,
  });

  return preview.previewUrl ?? inviteUrl;
}
