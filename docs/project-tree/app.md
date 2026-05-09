# app

- `layout.tsx`: global fonts, metadata, and root shell.
- `page.tsx`: project entry screen with role selection, seed overview, and env planning.
- `command/page.tsx`: command dashboard route with the live map, restricted-zone control, shared alerts, and ship inspection flow.
- `captain/[shipId]/page.tsx`: ship-scoped captain dashboard with a focused bridge map, restricted-zone overlays, shared alerts, and nearby context.
- `api/fleet/route.ts`: no-cache bootstrap endpoint for the authoritative runtime snapshot.
- `api/fleet/control/route.ts`: no-cache mutation endpoint for restricted zones and alert acknowledgement or resolution.
