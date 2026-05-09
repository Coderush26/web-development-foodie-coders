# app

- `layout.tsx`: global fonts, metadata, and root shell.
- `page.tsx`: project entry screen with role selection, seed overview, and env planning.
- `command/page.tsx`: Phase 3 command dashboard route with the live map, roster, and ship inspection flow.
- `captain/[shipId]/page.tsx`: Phase 3 ship-scoped captain dashboard with a focused bridge map and nearby context.
- `api/fleet/route.ts`: no-cache bootstrap endpoint for the authoritative runtime snapshot.
