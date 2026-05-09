import { getFleetScenarioSeed } from "@/features/fleet/data/scenario-seed";
import { getAuthPool } from "@/server/auth/db";
import { createId, hashPassword } from "@/server/auth/password";

let foundationPromise: Promise<void> | null = null;

function resolveBootstrapAdmin() {
  return {
    email: (process.env.AUTH_BOOTSTRAP_ADMIN_EMAIL ?? "admin@fleet.local").trim().toLowerCase(),
    password: process.env.AUTH_BOOTSTRAP_ADMIN_PASSWORD ?? "ChangeMe123!",
    fullName: (process.env.AUTH_BOOTSTRAP_ADMIN_NAME ?? "Fleet Super Admin").trim(),
  };
}

async function createTables() {
  const pool = getAuthPool();

  if (!pool) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      status text NOT NULL DEFAULT 'active',
      email_verified_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      token_hash text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      last_seen_at timestamptz NOT NULL DEFAULT now(),
      user_agent text,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      provider text NOT NULL,
      provider_account_id text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(provider, provider_account_id)
    );

    CREATE TABLE IF NOT EXISTS verifications (
      id text PRIMARY KEY,
      identifier text NOT NULL,
      token_hash text NOT NULL UNIQUE,
      kind text NOT NULL,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id text PRIMARY KEY,
      full_name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS member_roles (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      role text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id, role)
    );

    CREATE TABLE IF NOT EXISTS captain_ship_assignments (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      ship_id text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id, ship_id),
      UNIQUE(ship_id)
    );

    CREATE TABLE IF NOT EXISTS fleet_ship_registry (
      ship_id text PRIMARY KEY,
      name text NOT NULL,
      cargo text NOT NULL,
      destination_port_id text NOT NULL,
      seed_status text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS restricted_zones (
      id text PRIMARY KEY,
      name text NOT NULL,
      points jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS directives (
      id text PRIMARY KEY,
      ship_id text NOT NULL,
      type text NOT NULL,
      issued_at timestamptz NOT NULL,
      issued_by text NOT NULL,
      status text NOT NULL,
      target_port_id text,
      waypoint jsonb,
      note text,
      captain_response_id text,
      applied_at timestamptz
    );

    CREATE TABLE IF NOT EXISTS directive_responses (
      id text PRIMARY KEY,
      directive_id text NOT NULL,
      ship_id text NOT NULL,
      response text NOT NULL,
      responded_at timestamptz NOT NULL,
      distress_message text,
      distress_assessment jsonb
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id text PRIMARY KEY,
      source text NOT NULL,
      severity text NOT NULL,
      state text NOT NULL,
      title text NOT NULL,
      message text NOT NULL,
      affected_ship_ids jsonb NOT NULL,
      created_at timestamptz NOT NULL,
      acknowledged_at timestamptz,
      resolved_at timestamptz,
      metadata jsonb,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id text PRIMARY KEY,
      actor_user_id text,
      action text NOT NULL,
      target_type text NOT NULL,
      target_id text,
      metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;`);
}

async function seedFleetRegistry() {
  const pool = getAuthPool();

  if (!pool) {
    return;
  }

  const seed = getFleetScenarioSeed();

  for (const ship of seed.ships) {
    await pool.query(
      `
        INSERT INTO fleet_ship_registry (
          ship_id,
          name,
          cargo,
          destination_port_id,
          seed_status,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, now(), now())
        ON CONFLICT (ship_id) DO UPDATE
        SET name = EXCLUDED.name,
            cargo = EXCLUDED.cargo,
            destination_port_id = EXCLUDED.destination_port_id,
            seed_status = EXCLUDED.seed_status,
            updated_at = now()
      `,
      [ship.shipId, ship.name, ship.cargo, ship.destinationPortId, ship.status]
    );
  }
}

async function ensureBootstrapAdmin() {
  const pool = getAuthPool();

  if (!pool) {
    return;
  }

  const admin = resolveBootstrapAdmin();
  const existingUser = await pool.query<{ id: string }>(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    [admin.email]
  );

  const userId = existingUser.rows[0]?.id ?? createId("usr");

  if (!existingUser.rows[0]) {
    await pool.query(
      `
        INSERT INTO users (
          id,
          email,
          password_hash,
          status,
          email_verified_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, 'active', now(), now(), now())
      `,
      [userId, admin.email, hashPassword(admin.password)]
    );
  }

  await pool.query(
    `
      UPDATE users
      SET status = 'active',
          email_verified_at = COALESCE(email_verified_at, now()),
          updated_at = now()
      WHERE id = $1
    `,
    [userId]
  );

  await pool.query(
    `
      INSERT INTO user_profiles (user_id, full_name, created_at, updated_at)
      VALUES ($1, $2, now(), now())
      ON CONFLICT (user_id) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          updated_at = now()
    `,
    [userId, admin.fullName]
  );

  await pool.query(
    `
      INSERT INTO member_roles (id, user_id, role, created_at)
      VALUES ($1, $2, 'super_admin', now())
      ON CONFLICT (user_id, role) DO NOTHING
    `,
    [createId("role"), userId]
  );
}

export async function ensureAuthFoundation() {
  const pool = getAuthPool();

  if (!pool) {
    return;
  }

  if (!foundationPromise) {
    foundationPromise = (async () => {
      await createTables();
      await seedFleetRegistry();
      await ensureBootstrapAdmin();
    })().catch((error) => {
      foundationPromise = null;
      throw error;
    });
  }

  await foundationPromise;
}
