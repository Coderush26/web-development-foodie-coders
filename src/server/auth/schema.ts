import { jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import type { DistressAssessment } from "@/types/distress";
import type { GeoPoint } from "@/types/fleet";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    status: text("status").notNull().default("active"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
  })
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
  })
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    providerUnique: uniqueIndex("accounts_provider_unique").on(
      table.provider,
      table.providerAccountId
    ),
  })
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    tokenHash: text("token_hash").notNull(),
    kind: text("kind").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("verifications_token_hash_unique").on(table.tokenHash),
  })
);

export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  fullName: text("full_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const memberRoles = pgTable(
  "member_roles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    role: text("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userRoleUnique: uniqueIndex("member_roles_user_role_unique").on(table.userId, table.role),
  })
);

export const captainShipAssignments = pgTable(
  "captain_ship_assignments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    shipId: text("ship_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userShipUnique: uniqueIndex("captain_assignments_user_ship_unique").on(
      table.userId,
      table.shipId
    ),
    shipUnique: uniqueIndex("captain_assignments_ship_unique").on(table.shipId),
  })
);

export const fleetShipRegistry = pgTable("fleet_ship_registry", {
  shipId: text("ship_id").primaryKey(),
  name: text("name").notNull(),
  cargo: text("cargo").notNull(),
  destinationPortId: text("destination_port_id").notNull(),
  seedStatus: text("seed_status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const restrictedZones = pgTable("restricted_zones", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  points: jsonb("points").$type<GeoPoint[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const directives = pgTable("directives", {
  id: text("id").primaryKey(),
  shipId: text("ship_id").notNull(),
  type: text("type").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true, mode: "string" }).notNull(),
  issuedBy: text("issued_by").notNull(),
  status: text("status").notNull(),
  targetPortId: text("target_port_id"),
  waypoint: jsonb("waypoint").$type<GeoPoint | null>(),
  note: text("note"),
  captainResponseId: text("captain_response_id"),
  appliedAt: timestamp("applied_at", { withTimezone: true, mode: "string" }),
});

export const directiveResponses = pgTable("directive_responses", {
  id: text("id").primaryKey(),
  directiveId: text("directive_id").notNull(),
  shipId: text("ship_id").notNull(),
  response: text("response").notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true, mode: "string" }).notNull(),
  distressMessage: text("distress_message"),
  distressAssessment: jsonb("distress_assessment").$type<DistressAssessment | null>(),
});

export const alerts = pgTable("alerts", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  severity: text("severity").notNull(),
  state: text("state").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  affectedShipIds: jsonb("affected_ship_ids").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true, mode: "string" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true, mode: "string" }),
  metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null> | null>(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id"),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});
