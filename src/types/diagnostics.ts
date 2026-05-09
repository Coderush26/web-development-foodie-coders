import type { WeatherSeverity } from "@/types/weather";

export interface FleetRuntimeDiagnostics {
  generatedAt: string;
  snapshotGeneratedAt: string;
  simulationStartedAt: string;
  sequence: number;
  viewerCount: number;
  activeZones: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  tickRateHz: number;
  lastTickDurationMs: number;
  playbackFrameCount: number;
  playbackWindowMinutes: number;
  playbackResolutionSeconds: number;
  latestPlaybackCapturedAt: string | null;
  latestEventOccurredAt: string | null;
  latestAlertRaisedAt: string | null;
  weather: {
    provider: "open-meteo" | "stormglass" | "fallback" | "none";
    usingFallback: boolean;
    sampledAt: string | null;
    worstSeverity: WeatherSeverity | null;
  };
  distress: {
    providerMode: "local" | "openai";
    usingFallback: boolean;
    openAiConfigured: boolean;
    model: string | null;
  };
}
