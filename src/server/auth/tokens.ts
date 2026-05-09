import { and, eq, gt } from "drizzle-orm";

import { getAuthDb } from "@/server/auth/db";
import { ensureAuthFoundation } from "@/server/auth/foundation";
import { createId, createOpaqueToken, hashOpaqueToken } from "@/server/auth/password";
import { verifications } from "@/server/auth/schema";
import type { VerificationKind } from "@/server/auth/constants";

export async function createVerificationToken(input: {
  identifier: string;
  kind: VerificationKind;
  ttlHours: number;
}) {
  await ensureAuthFoundation();

  const db = getAuthDb();

  if (!db) {
    throw new Error("Authentication database is not configured.");
  }

  await db
    .delete(verifications)
    .where(and(eq(verifications.identifier, input.identifier), eq(verifications.kind, input.kind)));

  const token = createOpaqueToken();
  const expiresAt = new Date(Date.now() + input.ttlHours * 60 * 60 * 1000).toISOString();

  await db.insert(verifications).values({
    id: createId("ver"),
    identifier: input.identifier,
    tokenHash: hashOpaqueToken(token),
    kind: input.kind,
    expiresAt,
  });

  return {
    token,
    expiresAt,
  };
}

export async function peekVerificationToken(input: { token: string; kind: VerificationKind }) {
  await ensureAuthFoundation();

  const db = getAuthDb();

  if (!db) {
    return null;
  }

  const [record] = await db
    .select({
      id: verifications.id,
      identifier: verifications.identifier,
      kind: verifications.kind,
      expiresAt: verifications.expiresAt,
    })
    .from(verifications)
    .where(
      and(
        eq(verifications.tokenHash, hashOpaqueToken(input.token)),
        eq(verifications.kind, input.kind),
        gt(verifications.expiresAt, new Date().toISOString())
      )
    )
    .limit(1);

  return record ?? null;
}

export async function consumeVerificationToken(input: { token: string; kind: VerificationKind }) {
  const record = await peekVerificationToken(input);

  if (!record) {
    return null;
  }

  const db = getAuthDb();

  if (!db) {
    return null;
  }

  await db.delete(verifications).where(eq(verifications.id, record.id));
  return record;
}
