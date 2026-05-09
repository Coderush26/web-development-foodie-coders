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

For a production-style local run:

```bash
npm install
npm run build
npm run start
```

## Environment

Phase 5 still does not require any external API key.

The currently recognized runtime variables are:

- `HOSTNAME` defaults to `0.0.0.0`
- `PORT` defaults to `3000`
- `AI_PROVIDER=local` keeps distress extraction on the deterministic no-key fallback parser
- `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL` are optional if you want real-model distress extraction instead of the local parser
- `WEATHER_PROVIDER` remains reserved for Phase 6 weather work

See [.env.example](.env.example) for the current template.

## Docker Notes

The Docker setup is intentionally simple:

- `Dockerfile` installs dependencies, builds the Next.js app, and starts the custom Node server.
- `docker-compose.yml` exposes port `3000` and is designed so `docker compose up` works on a fresh clone.
- The container runs the same production command as local production mode: `npm run start`.

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
- live `POST /api/fleet/control` checks for zone create, alert acknowledge, and alert resolve
- live directive checks for issue, accept, next-tick application, and distress escalation
- live HTTP checks for `/command`, `/captain/MV-1`, and `/api/fleet`
- live WebSocket snapshot checks for `/api/fleet/ws`, including zone and alert payloads

## CI

GitHub Actions now runs the core verification pipeline automatically on every push and pull request:

- `npm test`
- `npm run lint`
- `npm run build`
