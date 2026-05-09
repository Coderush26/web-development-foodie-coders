# Fleet Crisis Ops Auth And Database Expansion Plan

This file is for the next productization step, not for the already completed challenge scope.

## Implementation Status

Phase 1 is now partially implemented in the codebase.

Already live:

- home-page auth toggle that switches the current browser between no-auth mode and protected mode
- Next 16 `proxy.ts` guard for `/command` and `/captain/[shipId]`
- bootstrap admin sign-in page at `/auth/login`
- Postgres-backed users, sessions, roles, ship-registry, and audit tables
- bootstrap fleet seed import into `fleet_ship_registry`
- protected API guards for bootstrap, control, playback, and diagnostics routes
- WebSocket session check on Node hosts

Still remaining for later phases:

- member invitations
- admin dashboard UI
- forgot-password and reset flows
- email verification
- full role-aware page navigation
- persistent directives, alerts, and zones beyond the current live runtime

## Straight Answer

- The current project is still valid for the original challenge without login, logout, or a database.
- If you want the app to feel like a real product, then authentication and persistence are the right next layer.
- A super admin role can help, but only if it stays an administration layer and does not become a third live-operations role competing with Command and Captain.
- The correct design is to keep the live simulation runtime in memory and add auth plus database around it.

## Best Fit For This Project

The requirement text is centered on two operational interfaces:

- `command`
- `captain`

Because of that, the best product direction is:

- keep `/` as the access portal
- keep `/command` and `/captain/[shipId]` as the judged runtime routes
- add a protected `/admin` area later for member management and ship-role assignment

That improves the product without weakening the original brief.

## Best Onboarding Model

Recommended default:

- super admin creates the member
- super admin assigns the role
- super admin assigns the captain ship when needed
- the system sends an invitation link
- the invited user sets the password and enters the correct role route

This is better than public self-sign-up plus later approval for this project because:

- it is closer to a controlled operations system
- it keeps role assignment accurate from the start
- it avoids public sign-up abuse and approval-queue complexity
- it matches the challenge better than a public user-acquisition flow

Public self-sign-up with approval can exist later if needed, but it should not be the first choice here.

## Recommended Stack

Primary recommendation for this project:

- Drizzle ORM
- Postgres-compatible database
- lightweight internal session layer for Phase 1
- local Postgres in Docker for judge-safe and laptop-safe runs
- Resend for real outbound mail in hosted environments
- console or Mailpit email preview for local judging and development

Why this stack fits better than Supabase-first here:

- the challenge explicitly says the system must run end-to-end on a laptop
- a local Postgres container is reproducible during judging
- Drizzle is lightweight, typed, and easy to migrate with
- the first auth layer stays inside your own app and can later be swapped for a larger auth library if needed
- Resend can stay optional instead of becoming a mandatory dependency

## Neon Versus Supabase

If you do not need Supabase-specific platform features, then a plain Postgres route is cleaner.

That means:

- use `DATABASE_URL` for the database connection
- point it to local Postgres during judging
- point it to Neon only in hosted environments if you want managed Postgres later

Important note:

- `DATABASE_URL` is a Postgres connection string
- a Supabase project URL is an HTTPS endpoint
- they are not the same value and should never be treated as the same thing

## Architecture Rule To Keep Fixed

If auth and database are added, keep these boundaries:

- Database stores users, roles, ship assignments, operational records, and audit history.
- In-memory runtime stays responsible for live ship movement, live alerts, weather ticks, routing decisions, and WebSocket fan-out.
- The runtime hydrates from the database at startup and writes important changes back to the database at controlled points.

That design keeps the app fast while still making it feel real.

## Core Roles To Add

- `super_admin`: creates members, disables members, assigns roles, and assigns captains to ships
- `command`: full fleet dashboard access
- `captain`: access only to the assigned ship dashboard

## Core Database Tables To Add

- `users`
- `sessions`
- `accounts`
- `verifications`
- `user_profiles`
- `member_roles`
- `captain_ship_assignments`
- `fleet_ship_registry`
- `restricted_zones`
- `directives`
- `directive_responses`
- `alerts`
- `audit_logs`

Optional later tables:

- `playback_archives`
- `member_invites`

Notes:

- `fleet.json` should still remain the source seed during development.
- The first database seed should import the same 15 ships so the operational logic stays aligned with the original challenge.

## Three-Phase Plan

Three phases is the right number if you want this done properly.

Two phases would be too compressed for all of these together:

- login and logout
- route protection
- super admin role
- invitations
- password setup and reset
- ship-role assignment
- database schema
- seed and migration flow
- WebSocket protection
- audit logging

### Phase 1 - Access Control Foundation

Goal:
Add the identity and database foundation without breaking the current live runtime.

Build in this phase:

- add Docker-backed local Postgres for judge-safe local runs
- add Drizzle configuration, schema, and migrations
- create the core auth, role, profile, ship registry, and assignment tables
- import the current 15 ships into the database as the initial registry seed
- integrate the protected-mode auth service into the app shell and server utilities
- add protected route middleware
- add server helpers for reading the signed-in user and role
- bootstrap one initial super admin account

Key implementation decisions:

- Command and Captain pages stop being open public routes
- the runtime still starts from the existing in-memory engine
- the database becomes the source of truth for people, roles, and persistent records
- sessions remain cookie-based by default, with optional short-lived WebSocket auth tokens only where needed

Deliverables:

- database schema
- migration scripts
- seed script
- session service setup
- protected route shell
- role model fixed in code and database

Exit criteria:

- a signed-in user can be identified reliably in server routes
- a non-signed-in user cannot open protected dashboards
- the app can seed the 15 ships into the database without changing the live simulation behavior

### Phase 2 - Super Admin Invitations And Real Auth Flows

Goal:
Make the access system feel complete and operationally believable.

Build in this phase:

- login page
- logout action
- invitation acceptance page
- email verification flow
- forgot-password flow
- reset-password screen
- change-password screen for logged-in users
- protected super admin dashboard at `/admin`
- member creation form for name, email, role, and ship assignment
- member disable or reactivate flow
- captain-to-ship assignment UI
- role-aware navigation and route guards
- session-aware WebSocket access so users only receive the correct dashboard data

Email strategy in this phase:

- use console or Mailpit locally so the flow works on a laptop
- use Resend later if hosted email delivery is needed

Deliverables:

- authentication screens
- invite-only onboarding flow
- protected admin dashboard area
- password reset and update flow
- proper role-based access control

Exit criteria:

- super admin can create members and send invitations
- captains cannot open another captain's ship page
- unauthenticated users cannot access live operational routes or sockets
- password recovery works end to end

### Phase 3 - Operational Persistence And Security Hardening

Goal:
Make the platform feel like a real secured operations product instead of only a simulation demo.

Build in this phase:

- persist directives and directive responses in the database
- persist alerts and acknowledgement history
- persist restricted zones so they survive restart
- persist captain ship assignments and admin changes
- write audit logs for login, logout, reset, verification, invite, member updates, and admin actions
- hydrate the live runtime from database-backed configuration at startup
- optionally archive snapshots for history beyond the in-memory hour buffer
- add access-denied states, loading states, and auth error handling
- add test coverage for protected routes and role boundaries
- update README and operator docs with the new security model

Important boundary in this phase:

- keep per-second simulation state in memory
- write meaningful events and controlled snapshots to the database
- do not turn every server tick into a database transaction

Deliverables:

- database-backed operational records
- persistent zones and directive history
- audit trail
- auth and role tests
- updated documentation

Exit criteria:

- restarting the app no longer loses key operational records
- admins can review who changed what
- the system stays responsive while still feeling secure and persistent

## What Helps Versus What Hurts

What helps:

- believable identity and role discipline
- proper captain-to-ship access control
- persistent records and auditability
- cleaner operator trust story

What hurts if rushed:

- turning the home route into a fake admin console before the backend exists
- making super admin look like a judged live-ops role
- relying on cloud-only services that cannot be reproduced during judging
- moving the second-by-second simulation into the database

## Future Environment Variables

If this plan starts, these are the keys to keep:

- `APP_BASE_URL`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `EMAIL_PROVIDER`
- `EMAIL_FROM`
- `RESEND_API_KEY`
- `MAILPIT_SMTP_HOST`
- `MAILPIT_SMTP_PORT`

Recommended defaults:

- `APP_BASE_URL=http://localhost:3000`
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fleet_crisis_ops`
- `EMAIL_PROVIDER=console`

## Final Recommendation

- For the original challenge: the current no-auth and no-database build is still reasonable and defendable.
- For the next serious product step: yes, add auth and a database.
- For this project specifically: use three phases, not two.
- Use invitation-based onboarding first.
- Use Drizzle with Postgres as the core data layer.
- Keep Neon optional for hosted environments, not mandatory for judging.
