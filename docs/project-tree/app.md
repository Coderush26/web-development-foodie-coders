# app

- `layout.tsx`: global fonts, metadata, and root shell.
- `page.tsx`: project entry screen with role selection, seed overview, and env planning.
- `command/page.tsx`: Phase 2 command route with the live authoritative fleet panel.
- `captain/[shipId]/page.tsx`: Phase 2 ship-scoped captain route with a live vessel panel.
- `api/fleet/route.ts`: no-cache bootstrap endpoint for the authoritative runtime snapshot.
