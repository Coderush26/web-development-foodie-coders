# Project Tree (Current)

## Rules

- Current state only (no history).
- Check here before creating new components/sections/utils.
- Keep entries short.
- Each category lives in its own file inside `docs/project-tree/` — open the relevant file directly instead of reading this whole index.

---

## Categories

- `docs/project-tree/app.md`
- `docs/project-tree/src.md`
- `docs/project-tree/docs.md`

## Quick-Find Guide

- `server.ts`: custom Node server that owns HTTP requests and WebSocket upgrades.
- `.env.example`: current runtime and optional external-service environment keys.
- `src/features/fleet/hooks/use-interpolated-fleet-view.ts`: shared client interpolation layer for smooth ship motion.
- `src/features/map/components/`: client-only Leaflet map stack plus restricted-zone draw and overlay controls.
- `src/features/alerts/components/alert-center.tsx`: shared alert stream UI used by both Command and Captain dashboards.
- `app/api/fleet/control/route.ts`: command mutation endpoint for zone create/update/delete and alert acknowledgement or resolution.
- `Dockerfile`: simple production container build for the full custom-server app.
- `docker-compose.yml`: clone-and-run local deployment entry for `docker compose up`.
- `README.md`: current run instructions plus the Docker and Vercel deployment notes.
