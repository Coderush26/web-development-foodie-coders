# Fleet Crisis Ops Build Plan

We are building a laptop-runnable fleet command system for the Strait of Hormuz crisis scenario. The app must simulate exactly 15 ships in real time, show them on a live map, let Command control zones and directives, let Captains respond or escalate distress, reroute around danger and weather, raise alerts fast, and provide the last hour of playback.

## How To Use This File

1. Read this file and `docs/problem-statement/ProblemStatment.txt` before starting any phase.
2. Execute only the current phase scope unless an earlier dependency is missing.
3. Stop after the current phase exit criteria are satisfied.
4. Keep files small, reusable, and beginner-friendly; avoid duplicated logic.
5. When a phase adds reusable modules, also update `docs/project-tree/` so future chats can discover them quickly.

## Project Decisions To Keep Fixed

- Use one Next.js codebase with shared TypeScript modules under `src/`.
- Treat the server as authoritative for simulation, routing, alerts, weather, directives, and playback history.
- Use `docs/problem-statement/fleet.json` as the fixed seed and always load exactly 15 active ships from it.
- Use WebSocket for live fleet state and discrete events. No polling.
- Use Leaflet for the map stack because it is lightweight, works well on a laptop, and supports polygon tooling cleanly.
- Use an in-memory store plus an in-memory ring buffer for playback. Persisting history across restarts is not required unless later requested.
- Use Open-Meteo first for weather because it is free and does not require an API key.
- Implement AI/NLP through a provider abstraction: real model/API when configured, deterministic local fallback when no key is present.
- Document every assumption the problem statement leaves open, especially fuel burn math and adverse weather thresholds.

## Suggested Project Shape

```text
app/
  page.tsx
  command/page.tsx
  captain/[shipId]/page.tsx
  api/
src/
  components/
  features/
    alerts/
    captain/
    command/
    fleet/
    map/
    playback/
  lib/
    geo/
    realtime/
    weather/
  server/
    alerts/
    directives/
    history/
    routing/
    simulation/
  types/
docs/
  phases.md
  project-tree/
```

## Assumptions To Lock Early

- Fuel burn formula is simulated, not nautical-grade. Pick one deterministic formula in Phase 2 and document it.
- Captain access is demo role-scoping by route or selector, not full authentication.
- Browser audio alerts require prior user interaction because of autoplay restrictions.
- Weather severity should be derived from documented thresholds such as wind speed and wave height.
- Playback only needs the last hour at 30-second resolution and does not need exact full-state reconstruction between snapshots.

## Phase 1 - Foundation And Shared Domain

Goal: replace the starter app with a real project skeleton and establish all shared types, constants, and layout decisions.

Build in this phase:

- Replace the default landing page with a project entry screen that explains Command vs Captain roles.
- Create route shells for `/command` and `/captain/[shipId]`.
- Add shared domain types for ships, alerts, directives, weather cells, playback frames, and roles.
- Add a seed loader around `fleet.json` plus central scenario constants for the grading thresholds.
- Set up the base folder structure under `src/` and start the `docs/project-tree/` index files that future phases will update.
- Define the app theme, metadata, and shared layout primitives without building the full dashboard yet.

Deliverables:

- Non-placeholder home page.
- Shared TypeScript types and config modules.
- Seed parsing utilities for ports, ships, and scenario bounds.
- Empty but navigable role pages.

Exit criteria:

- The app no longer looks like a fresh Next starter.
- A new chat can inspect the project and immediately see the intended structure.
- No real-time engine, map rendering, or alert logic has started yet.

## Phase 2 - Authoritative Simulation And WebSocket Backbone

Goal: make the backend own fleet state and stream it live to multiple clients.

Build in this phase:

- Create an in-memory authoritative fleet store seeded from `fleet.json`.
- Implement the main simulation tick at 1 Hz or faster.
- Advance ship position from speed and heading on each tick.
- Apply baseline fuel consumption and status transitions such as arrived, stopped, and out-of-fuel.
- Introduce the WebSocket transport, message schema, connection lifecycle, and reconnect-safe initial sync.
- Add a bootstrap endpoint or initial payload helper so clients can hydrate before the socket stream is warm.
- Add timestamps or sequence numbers so later phases can measure staleness and interpolation safely.

Deliverables:

- Server-owned ship state that changes on a timer.
- WebSocket channel for snapshots and fleet events.
- One place in the codebase that defines the live message contract.

Exit criteria:

- Exactly 15 ships are active in the simulation.
- At least 5 browser tabs can watch the same fleet and stay in sync locally.
- The app has live data, even if the UI is still basic.

## Phase 3 - Command And Captain Live Map Experience

Goal: put the real-time fleet onto an interactive map with correct role scoping and smooth movement.

Build in this phase:

- Add the interactive ocean map and render all ships in the Command view.
- Scope the Captain view to a single ship while still showing shared fleet context where useful.
- Add smooth interpolation between server updates so ships move continuously without teleporting.
- Add a ship details panel showing cargo, fuel, speed, destination, and operational status.
- Add a compact live system bar for connection state, last update time, and fleet summary.
- Make the layout work on desktop and mobile widths.

Deliverables:

- Working `/command` dashboard.
- Working `/captain/[shipId]` dashboard.
- Shared realtime hooks and map components that both roles reuse.

Exit criteria:

- The map is the main interaction surface, not a placeholder panel.
- Ship motion looks physically plausible between updates.
- Clicking a ship reliably reveals the required operational data.

## Phase 4 - Restricted Zones And Unified Alerts

Goal: add operator-drawn restricted zones and a real alert pipeline.

Build in this phase:

- Let Command draw, edit, and remove polygonal restricted zones on the map.
- Show the same zones as read-only overlays in Captain view.
- Store zones on the authoritative server and broadcast zone changes immediately.
- Add the unified alert model with severity, source, acknowledgement state, timestamps, and resolution state.
- Detect geofence breaches when a ship crosses into a zone and when a new zone is drawn around a ship already inside it.
- Add visual and audible alert presentation plus acknowledge and resolve actions.
- Mark affected ships as needing reroute so the routing engine in Phase 6 has clear triggers ready.

Deliverables:

- Zone drawing workflow for Command.
- Read-only zone visibility for Captains.
- Shared alert center visible across roles.

Exit criteria:

- Geofence alerts fire within 1 second of the boundary cross in local testing.
- A new zone placed over an existing ship creates an alert immediately.
- Alerts stay active until acknowledged or resolved.

## Phase 5 - Directives, Captain Responses, And Distress AI

Goal: implement the human workflow between Command and Captains, including free-form distress escalation.

Build in this phase:

- Add Command actions for reroute to port, divert to waypoint, and hold position.
- Deliver directives to the correct Captain in real time.
- Let the Captain respond with `ACCEPT` or `ESCALATE_DISTRESS`.
- If the Captain accepts, persist the directive so the next simulation tick can act on it.
- If the Captain escalates, capture a free-form distress message and run it through the AI/NLP extraction pipeline.
- Extract at least severity, issue type, and a quantified impact field when available.
- Feed the extracted structure into the shared alert pipeline so distress alerts are prioritized and visible to everyone immediately.

Deliverables:

- Directive history and captain inbox interaction.
- Shared event stream for directive sent, accepted, and distress escalation.
- AI provider abstraction plus a no-key fallback parser.

Exit criteria:

- A directive response is visible to all connected clients immediately.
- An accepted directive changes ship intent on the next server tick.
- A distress message becomes a structured alert, not just raw text.

## Phase 6 - Routing, Weather, Fuel Feasibility, And Proximity

Goal: make the simulation operationally smart instead of just visually live.

Build in this phase:

- Implement routing inside the navigable water polygon while avoiding restricted zones.
- Recompute route when a zone intersects the current path or when Command changes ship intent.
- Use current weather as a routing cost so paths avoid the worst conditions when possible.
- Apply the required 30% extra fuel burn whenever a ship is moving through adverse weather.
- Add insufficient-fuel and stranded state logic.
- Detect when no valid path exists and fire the corresponding alert.
- Continuously check ship pairs and raise proximity warnings when distance drops below 2 km.
- Render route polylines and any key path status in the UI.

Deliverables:

- Path planner with reroute triggers.
- Weather fetch, caching, and severity classification.
- Server-side proximity monitor.

Exit criteria:

- Ships reroute automatically when zones cut across their active path.
- Weather affects both fuel usage and route choice.
- `stranded`, `insufficient fuel`, and proximity warnings all flow through the shared alert system.

## Phase 7 - Playback Timeline And Operational Review

Goal: let operators inspect the last hour of fleet movement and key events.

Build in this phase:

- Store a playback snapshot every 30 seconds for the last hour.
- Keep a matching event history for alerts, directives, captain responses, and major status changes.
- Add a timeline or scrubber in Command view.
- Add a playback mode that reads historical snapshots without mutating the live authoritative simulation.
- Show historical ship positions and key events together so the timeline is useful, not just decorative.

Deliverables:

- History ring buffer.
- Playback UI controls.
- Historical event overlay or side panel.

Exit criteria:

- A user can scrub across the last hour and inspect fleet positions plus major events.
- Playback mode is clearly separated from live mode.
- The solution does not attempt unnecessary full event-sourcing complexity.

## Phase 8 - Hardening, Docker, README, And Grading Pass

Goal: make the project demo-ready and judge-ready.

Build in this phase:

- Add `docker-compose.yml` and ensure `docker compose up` starts the full system.
- Finalize README setup, environment variables, external service notes, and documented assumptions.
- Add local resilience for missing API keys or temporary weather/API failures.
- Verify lint, build, and basic manual acceptance flows.
- Tune UI polish, responsiveness, and alert clarity.
- Add simple instrumentation or logs to verify update cadence and alert timing during demos.
- Clean up rough edges without reopening the architecture.

Deliverables:

- Reproducible local startup.
- Final README and assumptions section.
- Demo checklist for the grading criteria.

Exit criteria:

- `docker compose up` works from a clean checkout.
- The repo clearly explains how weather and AI are configured.
- The project can be demoed end-to-end against the grading sheet without hand-waving missing core behavior.
