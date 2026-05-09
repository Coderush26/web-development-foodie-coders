# Fleet Crisis Ops Guide

This file explains the full project in simple wording.

## What This Project Does

Fleet Crisis Ops is a real-time operations system for a shipping crisis in the Strait of Hormuz.

The system simulates 15 ships on the server, updates them live, and shows the same shared state to everyone connected.

It has two main user dashboards:

- Command dashboard: manages the whole fleet.
- Captain dashboard: focuses on one ship only.

The system also includes:

- restricted zones
- shared alerts
- route planning
- weather-aware fuel and route logic
- captain directive responses
- distress-message extraction
- playback review

## Main Pages

### `/`

Purpose:
This is the home access portal. It is intentionally lighter now and is meant to route people into the correct operational screen.

What you can do here:

- open the system overview page
- open the Command dashboard
- open a Captain dashboard
- jump into one of the captain bridge routes quickly
- read the recommended future access model for admin, command, and captain roles

Main buttons on this page:

- `Open system overview`: opens the dedicated operational summary page at `/overview`
- `Open command center`: opens the full-fleet Command dashboard at `/command`
- `Open captain console`: opens a ship-scoped Captain dashboard at `/captain/MV-1`
- `Open dashboard` inside Fleet Command card: opens the Command dashboard
- `Open dashboard` inside Ship Captain card: opens the Captain dashboard
- captain route cards under Bridge consoles: open ship-specific captain dashboards like `/captain/MV-1`, `/captain/MV-7`, or `/captain/MV-13`

Why this page exists:

- the project has more than one route
- Command and Captain are still the two operational roles that matter most
- the detailed overview now lives on its own page instead of filling the home route

### `/overview`

Purpose:
This is the dedicated operational summary page.

What you can do here:

- review the scenario scope and live thresholds
- understand what Command and Captain each handle
- jump into the command or captain dashboards
- open ship-scoped captain routes from the bridge-console list

Main buttons on this page:

- `Open access portal`: returns to `/`
- `Open command center`: opens `/command`
- `Open captain console`: opens `/captain/MV-1`

### `/command`

Purpose:
This is the main fleet-wide operations dashboard.

Command can see the full situation and act on any ship.

Top buttons:

- `Open access portal`: returns to the home page
- `Open system overview`: opens `/overview`
- `Open captain console`: opens a captain route quickly for comparison or testing

Main sections on this page:

#### Live system bar

Purpose:
Shows high-level live status.

What it shows:

- role
- connection state
- last update age
- fleet summary
- restrictions summary
- currently focused ship

#### Fleet map

Purpose:
Main live control surface for the fleet.

What you can do:

- see all ships on the map
- click ships
- see restricted zones
- draw restricted zones in Command mode
- edit restricted zones in Command mode
- delete restricted zones in Command mode
- view weather overlays
- see route lines and vessel movement

Important behavior:

- the map is live in normal mode
- the map becomes read-only in playback mode

#### Playback review

Purpose:
Lets Command review recent operational history without touching the live simulation.

Main controls:

- `Live mode`: returns to the current live state
- `Playback mode`: switches to history review mode
- timeline scrubber: moves through the last hour of stored history

What it shows:

- selected playback frame
- event count in that frame
- active alerts in that frame
- first and last capture times in the current playback window

Important behavior:

- playback is read-only
- switching to playback freezes the visible state at a historical frame
- the live simulation still continues in the background

#### Runtime diagnostics

Purpose:
Shows operational health information for the running system.

What it shows:

- update cadence target and last tick duration
- current snapshot sequence and viewer count
- weather provider and fallback state
- playback buffer depth
- current distress extraction mode
- latest alert and event timing

Why it matters:

- helps verify the system is running correctly
- helps explain fallback behavior during local runs
- helps confirm playback and cadence behavior during review

#### Directive control

Purpose:
Lets Command send operational instructions to a selected ship.

Directive types:

- reroute to port
- divert to waypoint
- hold position

Main fields:

- `Directive type`
- `Target port`
- `Waypoint latitude`
- `Waypoint longitude`
- `Operator note`

Main button:

- `Send directive`: sends the instruction to the selected ship

What happens next:

- the directive appears in the ship's history
- the relevant Captain sees it live
- if accepted, the new intent is applied on the next server tick

#### Playback controls

Purpose:
This section appears only when playback mode is active.

What it tells you:

- live controls are disabled in playback mode
- return to live mode before issuing directives or handling alerts

#### Alert center

Purpose:
Shows the shared operational alert pipeline.

Alert sources include:

- geofence
- routing failure
- weather-related operational impact
- distress escalation
- proximity warnings

Main buttons in Command live mode:

- `Acknowledge`: marks an active alert as acknowledged
- `Resolve`: marks the alert as resolved

Important behavior:

- alerts stay visible until acknowledged or resolved
- in playback mode this section becomes review-only

#### Ship details

Purpose:
Shows detailed operational data for the selected ship.

What it shows:

- destination
- fuel remaining
- speed and heading
- fuel burn
- live or captured position
- distance remaining
- route status
- route path size
- fuel forecast
- current weather at the ship
- intent
- last server tick or captured time

#### Fleet roster

Purpose:
Lets Command jump between ships quickly.

What you can do:

- click any ship to focus it
- view status and destination summary for each ship

#### Event stream

Purpose:
Shows recent directives, alerts, status changes, and responses.

In live mode:

- shows the live operational stream

In playback mode:

- shows historical events around the selected playback frame

### `/captain/[shipId]`

Purpose:
This is the ship-scoped captain dashboard.

Each captain page is limited to a single ship.

Top buttons:

- `Open command center`: opens the Command dashboard
- `Open system overview`: opens `/overview`
- `Open access portal`: returns to the home page

Main sections on this page:

#### Live system bar

Purpose:
Shows connection and status summary for the captain route.

It uses the same live runtime as Command, but the highlighted ship is the captain's own vessel.

#### Bridge map

Purpose:
Shows the captain's ship in context.

What it shows:

- the captain's own ship in focus
- nearby fleet context
- restricted zones as read-only overlays
- weather overlays
- route lines and vessel movement

Important behavior:

- captains can see zones but cannot create or edit them

#### Captain inbox

Purpose:
Shows directives sent to that ship and lets the captain respond.

Main buttons:

- `Accept`: accepts the directive
- `Escalate distress`: sends a free-form distress message instead of complying

Distress behavior:

- the captain types a distress message
- the system extracts structure from it
- the structured result becomes part of the shared alert flow

#### Alert center

Purpose:
Shows the same shared alerts visible to Command.

Important behavior:

- captains can see the alerts
- Command owns acknowledge and resolve actions

#### Ship details

Purpose:
Shows the captain's current vessel data, route condition, fuel state, and weather state.

#### Nearby fleet context

Purpose:
Shows nearby ships for situational awareness.

What it shows:

- nearby ship IDs
- nearby ship names
- status
- current distance from the captain's ship
- current speed

#### Event stream

Purpose:
Shows recent operational events related to the shared runtime.

## Important System Features

### Live simulation

- exactly 15 ships are active
- the server is authoritative
- ships advance on the backend
- clients do not invent ship state on their own

### Smooth movement

- the server sends real snapshots
- the client interpolates between them for smooth motion
- this avoids visual teleporting

### Restricted zones

- Command can draw them
- Command can edit them
- Command can delete them
- Captains can only view them

### Alerts

The alert system is shared across the app.

It handles:

- zone breaches
- routing problems
- stranded ships
- insufficient-fuel risk
- proximity warnings
- distress escalations

### Directives

Command can issue:

- reroute to port
- divert to waypoint
- hold position

Captains can respond with:

- accept
- escalate distress

### Distress extraction

The system supports two modes:

- local parser mode
- OpenAI-backed mode

If OpenAI fails, the system falls back to the local parser.

### Weather and routing

- weather is fetched from Open-Meteo first
- adverse weather increases fuel burn by 30%
- routing uses weather as a path cost, not as an automatic reroute trigger
- if a path cannot be found, the ship becomes stranded and an alert is created

### Playback

- stores the last hour of history
- stores a snapshot every 30 seconds
- supports review mode on the Command dashboard
- keeps playback separate from live state mutation

## Internal API Routes

These are not normal user pages, but they are important:

### `/api/fleet`

Purpose:
Returns bootstrap fleet state for the live dashboards.

### `/api/fleet/control`

Purpose:
Accepts Command and Captain mutations.

Used for:

- zone create, update, delete
- alert acknowledge, resolve
- directive issue
- captain accept
- distress escalation

### `/api/fleet/playback`

Purpose:
Returns the playback history buffer.

### `/api/fleet/diagnostics`

Purpose:
Returns runtime diagnostics data.

## About Authentication And Database

### Authentication

There is no authentication system in this project.

Why:

- the problem statement does not require login or identity management
- the spec only requires role-based interfaces
- this project implements role access through page routing and scoped UI behavior

For this challenge, that is acceptable if documented clearly.

### Database

There is no database in this project.

Why:

- the problem statement does not require persistence across restarts
- the project must run end-to-end on a laptop
- in-memory runtime state is simpler and fits the challenge well
- playback history is also stored in memory, which matches the allowed scope

What this means:

- restarting the app resets live state and playback history

## Environment Variables

Main variables:

- `HOSTNAME`
- `PORT`
- `AI_PROVIDER`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `WEATHER_PROVIDER`

Recommended understanding:

- `AI_PROVIDER=local` is the safest fully local mode
- `AI_PROVIDER=openai` uses OpenAI first and falls back locally if needed
- `WEATHER_PROVIDER=open-meteo` uses live weather with fallback behavior already built in

## Simple Operator Flow

If you want the shortest way to understand the system, use this order:

1. Open `/`
2. Open `/command`
3. Click a ship in the roster or on the map
4. Draw a zone and watch the alert system react
5. Send a directive
6. Open `/captain/MV-1`
7. Accept the directive or escalate distress
8. Return to `/command`
9. Open playback mode and scrub old history

## Final Summary

This project is a real operational fleet simulator with two main dashboards:

- one for Command
- one for Captains

It is not based on static ship data rendered once in the UI.

The server owns the live state, routing, alerts, weather decisions, directives, captain responses, and playback history.

That is the core idea of the whole system.
