import assert from "node:assert/strict";
import test from "node:test";

import { buildFleetRuntimeDiagnostics } from "@/server/diagnostics/runtime";
import { createInitialFleetSnapshot } from "@/server/simulation/engine";
import type { PlaybackHistoryPayload } from "@/types/playback";
import type { FleetRuntimeSnapshot } from "@/types/realtime";

function createPlaybackHistoryPayload(snapshot: FleetRuntimeSnapshot): PlaybackHistoryPayload {
  return {
    windowMinutes: 60,
    resolutionSeconds: 30,
    frames: [
      {
        id: "frame-1",
        capturedAt: snapshot.generatedAt,
        sequence: snapshot.sequence,
        ships: snapshot.ships,
        zones: snapshot.zones,
        alerts: snapshot.alerts,
        weather: snapshot.weather,
        events: snapshot.events,
      },
    ],
  };
}

test("buildFleetRuntimeDiagnostics summarizes runtime, playback, weather, and distress mode", () => {
  const snapshot = createInitialFleetSnapshot();
  const diagnosticSnapshot: FleetRuntimeSnapshot = {
    ...snapshot,
    generatedAt: "2026-05-09T10:30:00.000Z",
    simulationStartedAt: "2026-05-09T09:30:00.000Z",
    sequence: 42,
    zones: [
      {
        id: "zone-1",
        name: "Inspection zone",
        createdAt: "2026-05-09T10:00:00.000Z",
        updatedAt: "2026-05-09T10:05:00.000Z",
        points: [
          { lat: 25.2, lng: 55.2 },
          { lat: 25.4, lng: 55.2 },
          { lat: 25.4, lng: 55.5 },
          { lat: 25.2, lng: 55.5 },
        ],
      },
    ],
    alerts: [
      {
        id: "alert-active",
        source: "system",
        severity: "critical",
        title: "Blocked route",
        message: "A ship has no valid route.",
        affectedShipIds: ["MV-1"],
        createdAt: "2026-05-09T10:25:00.000Z",
        state: "active",
      },
      {
        id: "alert-ack",
        source: "distress",
        severity: "warning",
        title: "Distress acknowledged",
        message: "Crew reported a flooding incident.",
        affectedShipIds: ["MV-2"],
        createdAt: "2026-05-09T10:10:00.000Z",
        acknowledgedAt: "2026-05-09T10:12:00.000Z",
        state: "acknowledged",
      },
      {
        id: "alert-resolved",
        source: "geofence",
        severity: "warning",
        title: "Zone cleared",
        message: "The vessel left the restricted zone.",
        affectedShipIds: ["MV-3"],
        createdAt: "2026-05-09T09:50:00.000Z",
        acknowledgedAt: "2026-05-09T09:52:00.000Z",
        resolvedAt: "2026-05-09T09:55:00.000Z",
        state: "resolved",
      },
    ],
    events: [
      {
        id: "event-1",
        kind: "status-change",
        occurredAt: "2026-05-09T10:26:00.000Z",
        shipIds: ["MV-1"],
        summary: "MV-1 became stranded.",
        severity: "critical",
      },
      {
        id: "event-2",
        kind: "directive",
        occurredAt: "2026-05-09T10:20:00.000Z",
        shipIds: ["MV-2"],
        summary: "Command issued a hold-position directive.",
      },
    ],
    weather: {
      provider: "open-meteo",
      sampledAt: "2026-05-09T10:28:00.000Z",
      usingFallback: true,
      cells: [
        {
          id: "weather-1",
          center: { lat: 25.5, lng: 56.1 },
          windSpeedKnots: 32,
          waveHeightMeters: 2.8,
          severity: "adverse",
          sampledAt: "2026-05-09T10:28:00.000Z",
        },
      ],
    },
    telemetry: {
      ...snapshot.telemetry,
      viewerCount: 3,
      tickRateHz: 1,
      lastTickDurationMs: 12,
    },
  };

  const diagnostics = buildFleetRuntimeDiagnostics(
    diagnosticSnapshot,
    createPlaybackHistoryPayload(diagnosticSnapshot),
    "2026-05-09T10:30:30.000Z"
  );

  assert.deepEqual(diagnostics.weather, {
    provider: "open-meteo",
    usingFallback: true,
    sampledAt: "2026-05-09T10:28:00.000Z",
    worstSeverity: "adverse",
  });
  assert.equal(diagnostics.generatedAt, "2026-05-09T10:30:30.000Z");
  assert.equal(diagnostics.sequence, 42);
  assert.equal(diagnostics.viewerCount, 3);
  assert.equal(diagnostics.activeZones, 1);
  assert.equal(diagnostics.activeAlerts, 1);
  assert.equal(diagnostics.acknowledgedAlerts, 1);
  assert.equal(diagnostics.resolvedAlerts, 1);
  assert.equal(diagnostics.playbackFrameCount, 1);
  assert.equal(diagnostics.latestPlaybackCapturedAt, "2026-05-09T10:30:00.000Z");
  assert.equal(diagnostics.latestEventOccurredAt, "2026-05-09T10:26:00.000Z");
  assert.equal(diagnostics.latestAlertRaisedAt, "2026-05-09T10:25:00.000Z");
  assert.equal(diagnostics.distress.providerMode, "local");
  assert.equal(diagnostics.distress.usingFallback, true);
  assert.equal(diagnostics.distress.openAiConfigured, false);
  assert.equal(diagnostics.distress.model, null);
});
