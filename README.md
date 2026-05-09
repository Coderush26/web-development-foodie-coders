# Fleet Crisis Ops

Fleet Crisis Ops is a laptop-runnable realtime shipping-crisis simulator for the Strait of Hormuz scenario. It runs a server-owned fleet simulation, streams live ship state over WebSocket, and renders separate Command and Captain map dashboards from the same authoritative runtime.

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

See [.env.example](.env.example) for the current template.

## External Services And Fallbacks

- Open-Meteo is the default weather source. It requires no API key. If the request fails or only partial marine data returns, the runtime keeps the demo alive with deterministic fallback weather cells instead of breaking routing or playback.
- OpenAI-compatible distress extraction is optional. When `AI_PROVIDER=local`, the app uses the built-in deterministic parser. When `AI_PROVIDER=openai`, the runtime attempts model extraction and falls back locally if the key is missing or the API call fails.
- The command dashboard now includes a `Runtime diagnostics` card, and the same data is available via `/api/fleet/diagnostics` for smoke tests and demo verification.

## Assumptions

- Fuel burn is deterministic simulation math, not nautical-grade routing software.
- Captain access is route-scoped demo access, not full authentication.
- The authoritative fleet runtime and playback buffer are in-memory only, so both reset on process restart.
- Playback stores the last hour at 30-second resolution and does not reconstruct every sub-second intermediate state.
- Browser audio alerts still depend on prior user interaction because of autoplay restrictions.

## Docker Notes

The Docker setup is intentionally simple:

- `Dockerfile` installs dependencies, builds the Next.js app, and starts the custom Node server.
- `docker-compose.yml` exposes port `3000` and is designed so `docker compose up` works on a fresh clone.
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

Vercel is not a full deployment target for the current architecture.

This app currently depends on:

- a custom Node server in [server.ts](server.ts)
- raw WebSocket upgrades for `/api/fleet/ws`
- one in-memory authoritative runtime shared by all connected clients

That works well for local Docker and for Node hosts such as Railway, Render, Fly.io, or a VPS container, but it does not map cleanly to Vercel's serverless model. Vercel can build the Next.js app, but the live custom-server WebSocket runtime used in Phases 2 and 3 will not run there as-is.

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
