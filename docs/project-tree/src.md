# src

- `components/home/`: entry-screen cards for roles, seed ship preview, and service planning.
- `components/shell/`: reusable route shell and section card primitives.
- `config/`: grading thresholds, role definitions, and env/service configuration.
- `features/alerts/components/`: shared alert center for visual alert presentation across both roles.
- `features/alerts/hooks/`: audible alert hook that plays a short tone when new active alerts arrive.
- `features/command/hooks/`: command-only control hook for restricted-zone and alert mutations.
- `features/fleet/components/`: live dashboards, system bar, roster, and ship detail cards for command and captain flows.
- `features/fleet/data/`: typed loader for the shared fleet JSON seed.
- `features/fleet/hooks/`: interpolated fleet-view hook that turns authoritative snapshots into smooth client motion.
- `features/map/components/`: client-only Leaflet map surface, ship markers, and restricted-zone draw or read-only overlays.
- `lib/geo/`: distance, destination, and polygon helpers used by the simulation engine and geofence checks.
- `lib/realtime/`: socket protocol helpers, the bootstrap plus WebSocket client hook, and the command control client.
- `server/alerts/`: server-side geofence evaluation that creates and updates authoritative alerts.
- `server/simulation/`: authoritative in-memory fleet engine, tick constants, and runtime singleton that now owns zones and alerts.
- `types/`: shared domain contracts plus runtime snapshot, control-command, alert, and restricted-zone types.
- `server/alerts/geofence.test.ts`: built-in Node test harness that locks down immediate and delayed geofence alert behavior.
