export const appCopy = {
  name: "Fleet Crisis Ops",
  summary:
    "A real-time fleet command system for a Strait of Hormuz crisis: live vessel awareness, role-based control, distress handling, rerouting, alerts, and playback.",
};

export const gradingThresholds = {
  exactActiveShips: 15,
  minUpdateRateHz: 1,
  maxStateDeliveryMsP95: 500,
  geofenceAlertDeadlineMs: 1000,
  proximityWarningKm: 2,
  adverseWeatherFuelMultiplier: 1.3,
  minConcurrentWatchers: 5,
  playbackWindowMinutes: 60,
  playbackResolutionSeconds: 30,
} as const;

export const roleDefinitions = {
  command: {
    title: "Fleet Command",
    href: "/command",
    summary: "See the full fleet, draw restricted zones, acknowledge alerts, and issue directives.",
    capabilities: [
      "Full-fleet visibility",
      "Restricted zone control",
      "Directive dispatch and alert ownership",
    ],
  },
  captain: {
    title: "Ship Captain",
    href: "/captain/MV-1",
    summary:
      "Operate a single ship, receive command directives, and escalate distress with structured impact.",
    capabilities: [
      "Ship-scoped situational view",
      "Directive accept or distress escalation",
      "Route, weather, and fuel awareness",
    ],
  },
} as const;

export const captainSampleShipIds = ["MV-1", "MV-7", "MV-13"] as const;

export const phaseOneWorkstreams = [
  {
    title: "Shared domain model",
    body: "Ship, alert, directive, weather, and playback types now live in one reusable layer.",
    detail:
      "Later phases can build simulation, routing, and UI features without redefining the same objects in multiple places.",
  },
  {
    title: "Scenario seed loader",
    body: "The app reads the grading fleet JSON through a typed parser instead of embedding demo-only values in the UI.",
    detail:
      "That keeps the source of truth stable and gives future phases one place to validate ports, ships, and bounds.",
  },
  {
    title: "Role route shells",
    body: "Command and Captain routes already exist with stable layouts and shared navigation.",
    detail:
      "Later phases can focus on behavior and data flow without reopening the route structure.",
  },
  {
    title: "Integration prep",
    body: "Optional AI and weather configuration is documented now so later phases do not invent env names ad hoc.",
    detail:
      "Open-Meteo needs no key, while AI stays optional behind a provider toggle and local fallback plan.",
  },
] as const;
