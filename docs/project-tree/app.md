# app

- `layout.tsx`: global fonts, metadata, and root shell.
- `page.tsx`: home access portal with role launch paths and guidance for the future auth model.
- `overview/page.tsx`: dedicated operational summary route for fleet scope, thresholds, and launch paths.
- `command/page.tsx`: command dashboard route with the live map, restricted-zone control, directive issuance, shared alerts, and the operational event stream.
- `captain/[shipId]/page.tsx`: ship-scoped captain dashboard with a focused bridge map, directive inbox, distress escalation, shared alerts, and nearby context.
- `api/fleet/route.ts`: no-cache bootstrap endpoint for the authoritative runtime snapshot.
- `api/fleet/playback/route.ts`: no-cache playback-history endpoint for the last hour of captured fleet frames and event buckets.
- `api/fleet/diagnostics/route.ts`: no-cache runtime diagnostics endpoint for demo cadence, weather fallback, playback depth, and distress-provider mode.
- `api/fleet/control/route.ts`: no-cache mutation endpoint for restricted zones, alerts, directives, captain responses, and distress escalation.
