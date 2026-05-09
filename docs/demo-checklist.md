# Demo Checklist

Use this checklist for grading runs, smoke tests, or final local verification.

## Startup

1. Run `docker compose up` for the clean-clone path, or `npm install && npm run dev` for local development.
2. Open `http://localhost:3000`.
3. Confirm the landing page explains both Command and Captain roles.

## Command Live Operations

1. Open `/command`.
2. Confirm the live map loads and ships are moving smoothly.
3. Check `Runtime diagnostics` for:
   - live tick cadence and last tick duration
   - playback frame depth
   - current weather source and fallback state
   - distress extraction mode
4. Draw or edit a restricted zone and verify a shared alert appears quickly.
5. Acknowledge or resolve the alert from Command.

## Captain Workflow

1. Open `/captain/MV-1` or another active vessel.
2. Verify the captain view stays ship-scoped but still shows shared context.
3. From Command, issue a directive to that vessel.
4. From Captain, either:
   - accept the directive and confirm the next tick applies the new intent
   - escalate distress and confirm the structured alert appears in the shared pipeline

## Operational Planning

1. Confirm route lines are visible in live mode.
2. Verify weather overlays and ship weather state are present.
3. If a route becomes impossible, confirm the ship moves into `stranded` or related operational alert state instead of silently failing.
4. Check that proximity, geofence, and distress alerts all land in the same alert model.

## Playback Review

1. Stay on `/command` until playback history has at least a few frames.
2. Switch to playback mode.
3. Confirm the playback banner appears and the map becomes read-only.
4. Move the scrubber to an older frame and confirm:
   - captured ship position changes
   - historical alerts and event stream update
   - directive issuance and alert actions stay disabled
5. Return to live mode and confirm live controls return.

## Final Acceptance

1. Run `npm test`.
2. Run `npm run lint`.
3. Run `npm run build`.
4. Run `docker compose config`.
5. If using the default local setup, confirm the app still runs correctly without `OPENAI_API_KEY`.
