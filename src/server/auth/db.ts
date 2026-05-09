import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/server/auth/schema";

export type AuthDatabase = NodePgDatabase<typeof schema>;

let pool: Pool | null = null;
let db: AuthDatabase | null = null;

export function getAuthDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  return value ? value : null;
}

export function isAuthDatabaseConfigured() {
  return Boolean(getAuthDatabaseUrl());
}

export function getAuthPool() {
  const databaseUrl = getAuthDatabaseUrl();

  if (!databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      max: 1,
      connectionTimeoutMillis: 15_000,
      idleTimeoutMillis: 30_000,
    });
  }

  return pool;
}

export function getAuthDb() {
  const authPool = getAuthPool();

  if (!authPool) {
    return null;
  }

  if (!db) {
    db = drizzle(authPool, { schema });
  }

  return db;
}
