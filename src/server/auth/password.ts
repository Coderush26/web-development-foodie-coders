import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function createId(prefix: string) {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export function createOpaqueToken() {
  return randomBytes(32).toString("hex");
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${digest}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, digest] = storedHash.split(":");

  if (algorithm !== "scrypt" || !salt || !digest) {
    return false;
  }

  const candidate = scryptSync(password, salt, KEY_LENGTH);
  const storedBuffer = Buffer.from(digest, "hex");

  if (candidate.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(candidate, storedBuffer);
}
