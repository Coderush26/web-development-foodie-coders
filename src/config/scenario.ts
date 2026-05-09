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
