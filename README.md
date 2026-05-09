# Fleet Crisis Ops

Fleet Crisis Ops is a laptop-runnable realtime shipping-crisis simulator for the Strait of Hormuz scenario. It runs a server-owned fleet simulation, streams live ship state over WebSocket, and renders separate Command and Captain map dashboards from the same authoritative runtime.

It now also includes an opt-in Phase 2 protected mode. By default, the app still runs exactly as the original no-auth simulator. From the home page, you can switch the current browser into `Authentication enabled` mode to test the new DB-backed access layer without affecting the default open-access demo flow.

The current build includes:

- live fleet simulation for 15 vessels
- command-side restricted-zone drawing, editing, and deletion
- captain read-only restricted-zone overlays
- shared geofence alerts with acknowledge and resolve actions
- command-issued directives for reroute, waypoint diversion, and hold position
- captain inbox actions for ACCEPT and ESCALATE_DISTRESS
- structured distress extraction with an optional OpenAI provider and a built-in no-key local fallback
- route planning with zone avoidance, weather-aware cost scoring, and stranded or insufficient-fuel alerts
- one-hour playback review with a 30-second history buffer and historical event stream
- command-side runtime diagnostics for tick cadence, playback depth, weather fallback, and distress-provider mode
- optional protected-mode auth with super-admin member management, invite acceptance, email verification, password reset, and change-password flows

## Quick Start

If someone clones this repository and just wants to run the full app, this is the command path the project now supports:

```bash
docker compose up
```

The app will be available at `http://localhost:3000`.

If Docker needs to rebuild after code changes, use:

```bash
docker compose up --build
```

## Local Node.js Run

For local development without Docker:

```bash
npm install
npm run dev
```

Use `http://localhost:3000` for the browser during development. `127.0.0.1` is now allowed too, but `localhost` remains the default path used in the docs and smoke checks.

For a production-style local run:

```bash
npm install
npm run build
npm run start
```

## Environment

No external API key is required for the default local run.

The currently recognized runtime variables are:

- `HOSTNAME` defaults to `0.0.0.0`
- `PORT` defaults to `3000`
- `AI_PROVIDER=local` keeps distress extraction on the deterministic no-key fallback parser
- `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL` are optional if you want real-model distress extraction instead of the local parser
- `WEATHER_PROVIDER=open-meteo` uses live Open-Meteo weather first and automatically falls back to deterministic synthetic weather if the provider is slow or unavailable
- `DATABASE_URL` is optional unless you want to use the new protected-mode auth flow
- `AUTH_BOOTSTRAP_ADMIN_EMAIL`, `AUTH_BOOTSTRAP_ADMIN_PASSWORD`, and `AUTH_BOOTSTRAP_ADMIN_NAME` define the local bootstrap super-admin account for protected mode
- `APP_BASE_URL` defines the base URL used in invite, verification, and password-reset links
- `EMAIL_PROVIDER=console` keeps invite, verify, and reset flows laptop-safe by logging the action links and surfacing local preview URLs in the UI

The default example `DATABASE_URL` now uses `localhost:5433` so it does not collide with an existing local Postgres already bound to `5432`.

See [.env.example](.env.example) for the current template.

## Protected Mode Toggle

The home page now includes an `Authentication toggle` card.

- `Authentication disabled` keeps the current simulator open and unchanged.
- `Authentication enabled` turns on route and API protection for the current browser only.
- when protected mode is enabled, `/command` and `/captain/[shipId]` redirect to `/auth/login` until a valid session exists

Protected mode currently provides:

- Drizzle schema and Postgres-backed auth foundation
- bootstrap super-admin creation
- DB-backed session cookies
- protected route proxy for Admin, Command, and Captain pages
- protected `/admin` member-management console
- invite-based member onboarding with local preview links
- email verification flow
- forgot-password, reset-password, and change-password flows
- role-aware navigation and post-login redirects
- protected API guards for fleet bootstrap, control, playback, and diagnostics
- captain ship assignment UI and captain-route enforcement
- scoped bootstrap and WebSocket access on Node hosts so captain sessions only receive their assigned ship feed plus limited nearby context

The bootstrap admin defaults are:

- email: `admin@fleet.local`
- password: `ChangeMe123!`

Change them through environment variables before sharing the protected mode with anyone else.

## External Services And Fallbacks

- Open-Meteo is the default weather source. It requires no API key. If the request fails or only partial marine data returns, the runtime keeps the demo alive with deterministic fallback weather cells instead of breaking routing or playback.
- OpenAI-compatible distress extraction is optional. When `AI_PROVIDER=local`, the app uses the built-in deterministic parser. When `AI_PROVIDER=openai`, the runtime attempts model extraction and falls back locally if the key is missing or the API call fails.
- The command dashboard now includes a `Runtime diagnostics` card, and the same data is available via `/api/fleet/diagnostics` for smoke tests and demo verification.

## Assumptions

- Fuel burn is deterministic simulation math, not nautical-grade routing software.
- Protected mode is optional. When it is disabled, the original open-access challenge flow still runs exactly as before.
- The authoritative fleet runtime and playback buffer are in-memory only, so both reset on process restart.
- Playback stores the last hour at 30-second resolution and does not reconstruct every sub-second intermediate state.
- Browser audio alerts still depend on prior user interaction because of autoplay restrictions.

## Docker Notes

The Docker setup is intentionally simple:

- `Dockerfile` installs dependencies, builds the Next.js app, and starts the custom Node server.
- `docker-compose.yml` now starts both the app and a local Postgres service so the new Phase 1 protected mode works in Docker as well.
- The container runs the same production command as local production mode: `npm run start`.

`docker compose config` resolves cleanly for the current setup, so the compose file is structurally valid before the first container launch.

## Demo Checklist

The grading-oriented checklist lives in [docs/demo-checklist.md](docs/demo-checklist.md).

The shortest end-to-end demo path is:

1. Start the app with `docker compose up` or `npm run dev`.
2. Open `/command` and confirm the `Runtime diagnostics` card shows tick cadence, playback depth, and weather mode.
3. Create a restricted zone, confirm the shared alert pipeline reacts, and acknowledge or resolve the alert.
4. Issue a directive from Command, accept or escalate it from a Captain route, and verify the event stream updates live.
5. Enter playback mode, scrub to an older frame, confirm the map becomes read-only, then return to live mode.

## Vercel Note

Vercel is still not a full deployment target for the current architecture.

This app currently depends on:

- a custom Node server in [server.ts](server.ts)
- raw WebSocket upgrades for `/api/fleet/ws`
- one in-memory authoritative runtime shared by all connected clients

That works well for local Docker and for Node hosts such as Railway, Render, Fly.io, or a VPS container, but it does not map cleanly to Vercel's serverless model. Vercel can build the Next.js app, but the live custom-server WebSocket runtime used in Phases 2 and 3 will not run there as-is.

The app now handles that more gracefully on Vercel preview-style hosts:

- the bootstrap route reports `snapshot` transport mode instead of attempting the unsupported WebSocket upgrade
- the client stops retrying the broken socket path and shows a clear host-capability message instead of the raw disconnect loop

This removes the noisy WebSocket failure, but it does not turn Vercel into a full realtime deployment target.

If Vercel deployment becomes mandatory later, the realtime layer will need an architectural change such as:

1. moving WebSocket/realtime state to a managed service
2. replacing the custom server with a Vercel-compatible transport pattern
3. moving the full app deployment to a container-friendly host instead of Vercel

## Validation

The app has been verified with:

- `npm run lint`
- `npm run build`
- `npm test`
- `docker compose config`
- live `POST /api/fleet/control` checks for zone create, alert acknowledge, and alert resolve
- live directive checks for issue, accept, next-tick application, and distress escalation
- live HTTP checks for `/command`, `/captain/MV-1`, `/api/fleet`, `/api/fleet/playback`, and `/api/fleet/diagnostics`
- live WebSocket snapshot checks for `/api/fleet/ws`, including zone and alert payloads
- live command smoke verification for playback mode, scrubber interaction, and the frozen-map review flow

## CI

GitHub Actions now runs the core verification pipeline automatically on every push and pull request:

- `npm test`
- `npm run lint`
- `npm run build`
