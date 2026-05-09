# app

- `layout.tsx`: global fonts, metadata, and root shell.
- `page.tsx`: project entry screen with role selection, seed overview, and env planning.
- `command/page.tsx`: command dashboard route with the live map, restricted-zone control, directive issuance, shared alerts, and the operational event stream.
- `captain/[shipId]/page.tsx`: ship-scoped captain dashboard with a focused bridge map, directive inbox, distress escalation, shared alerts, and nearby context.
- `api/fleet/route.ts`: no-cache bootstrap endpoint for the authoritative runtime snapshot.
- `api/fleet/playback/route.ts`: no-cache playback-history endpoint for the last hour of captured fleet frames and event buckets.
- `api/fleet/control/route.ts`: no-cache mutation endpoint for restricted zones, alerts, directives, captain responses, and distress escalation.
