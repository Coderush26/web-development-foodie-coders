# src

- `components/home/`: entry-screen cards for roles, seed ship preview, and service planning.
- `components/shell/`: reusable route shell and section card primitives.
- `config/`: grading thresholds, role definitions, and env/service configuration.
- `features/fleet/components/`: Phase 3 dashboards, system bar, roster, and ship detail cards for command and captain flows.
- `features/fleet/data/`: typed loader for the shared fleet JSON seed.
- `features/fleet/hooks/`: interpolated fleet-view hook that turns authoritative snapshots into smooth client motion.
- `features/map/components/`: client-only Leaflet map surface and wrapper shared by both role dashboards.
- `lib/geo/`: distance and destination helpers used by the simulation engine.
- `lib/realtime/`: Phase 2 socket protocol helpers and the bootstrap plus WebSocket client hook.
- `server/simulation/`: authoritative in-memory fleet engine, tick constants, and runtime singleton.
- `types/`: shared domain contracts plus the Phase 2 runtime snapshot types.
