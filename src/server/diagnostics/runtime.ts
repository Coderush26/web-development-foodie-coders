import { runtimeConfig } from "@/config/runtime";
import type { PlaybackHistoryPayload } from "@/types/playback";
import type { FleetRuntimeSnapshot } from "@/types/realtime";
import type { FleetRuntimeDiagnostics } from "@/types/diagnostics";
import type { WeatherSeverity } from "@/types/weather";

const severityRank: Record<WeatherSeverity, number> = {
  clear: 0,
  watch: 1,
  adverse: 2,
};

function getLatestTimestamp(values: Array<string | null | undefined>) {
  const filteredValues = values.filter((value): value is string => Boolean(value));

  if (filteredValues.length === 0) {
    return null;
  }

  return filteredValues.reduce((latest, value) =>
    Date.parse(value) > Date.parse(latest) ? value : latest
  );
}

function getWorstWeatherSeverity(snapshot: FleetRuntimeSnapshot): WeatherSeverity | null {
  const severities = snapshot.weather?.cells.map((cell) => cell.severity) ?? [];

  if (severities.length === 0) {
    return null;
  }

  return severities.reduce((worst, severity) =>
    severityRank[severity] > severityRank[worst] ? severity : worst
  );
}

export function buildFleetRuntimeDiagnostics(
  snapshot: FleetRuntimeSnapshot,
  playbackHistory: PlaybackHistoryPayload,
  generatedAt = new Date().toISOString()
): FleetRuntimeDiagnostics {
  const latestFrame = playbackHistory.frames.at(-1) ?? null;
  const latestEventOccurredAt = getLatestTimestamp(
    snapshot.events.map((event) => event.occurredAt)
  );
  const latestAlertRaisedAt = getLatestTimestamp(snapshot.alerts.map((alert) => alert.createdAt));
  const activeAlerts = snapshot.alerts.filter((alert) => alert.state === "active").length;
  const acknowledgedAlerts = snapshot.alerts.filter(
    (alert) => alert.state === "acknowledged"
  ).length;
  const resolvedAlerts = snapshot.alerts.filter((alert) => alert.state === "resolved").length;
  const weather = snapshot.weather;

  return {
    generatedAt,
    snapshotGeneratedAt: snapshot.generatedAt,
    simulationStartedAt: snapshot.simulationStartedAt,
    sequence: snapshot.sequence,
    viewerCount: snapshot.telemetry.viewerCount,
    activeZones: snapshot.zones.length,
    activeAlerts,
    acknowledgedAlerts,
    resolvedAlerts,
    tickRateHz: snapshot.telemetry.tickRateHz,
    lastTickDurationMs: snapshot.telemetry.lastTickDurationMs,
    playbackFrameCount: playbackHistory.frames.length,
    playbackWindowMinutes: playbackHistory.windowMinutes,
    playbackResolutionSeconds: playbackHistory.resolutionSeconds,
    latestPlaybackCapturedAt: latestFrame?.capturedAt ?? null,
    latestEventOccurredAt,
    latestAlertRaisedAt,
    weather: {
      provider: weather?.provider ?? "none",
      usingFallback: weather?.usingFallback ?? false,
      sampledAt: weather?.sampledAt ?? null,
      worstSeverity: getWorstWeatherSeverity(snapshot),
    },
    distress: {
      providerMode: runtimeConfig.aiProvider,
      usingFallback: runtimeConfig.aiProvider !== "openai" || !runtimeConfig.openAiApiKeyConfigured,
      openAiConfigured: runtimeConfig.openAiApiKeyConfigured,
      model: runtimeConfig.aiProvider === "openai" ? runtimeConfig.openAiModel : null,
    },
  };
}
