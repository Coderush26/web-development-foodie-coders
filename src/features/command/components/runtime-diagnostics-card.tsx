"use client";

import { SectionCard } from "@/components/shell/section-card";
import { useFleetRuntimeDiagnostics } from "@/features/command/hooks/use-fleet-runtime-diagnostics";

function formatTimeLabel(value: string | null) {
  return value ? new Date(value).toLocaleTimeString() : "Awaiting data";
}

function formatWeatherProviderLabel(provider: string, usingFallback: boolean) {
  if (provider === "fallback") {
    return "Fallback synthetic weather";
  }

  if (provider === "none") {
    return "Awaiting weather sample";
  }

  return usingFallback ? "Open-Meteo with fallback blending" : "Open-Meteo live feed";
}

function resolveTone(lastTickDurationMs: number | undefined, weatherFallback: boolean) {
  if ((lastTickDurationMs ?? 0) > 500 || weatherFallback) {
    return "warning" as const;
  }

  if ((lastTickDurationMs ?? 0) > 150) {
    return "accent" as const;
  }

  return "default" as const;
}

export function RuntimeDiagnosticsCard() {
  const { diagnostics, error } = useFleetRuntimeDiagnostics();

  return (
    <SectionCard
      title="Runtime diagnostics"
      description="Judge-facing instrumentation for cadence, fallback mode, alert timing, and playback depth during live demos."
      tone={resolveTone(
        diagnostics?.lastTickDurationMs,
        diagnostics?.weather.usingFallback ?? false
      )}
    >
      {error ? (
        <p className="text-sm leading-7 text-accent-strong">{error}</p>
      ) : diagnostics ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Update cadence</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {diagnostics.tickRateHz.toFixed(1)} Hz target · {diagnostics.lastTickDurationMs} ms
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              Snapshot {diagnostics.sequence} · {diagnostics.viewerCount} live viewers
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Weather source</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {formatWeatherProviderLabel(
                diagnostics.weather.provider,
                diagnostics.weather.usingFallback
              )}
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              Worst severity: {diagnostics.weather.worstSeverity ?? "unknown"} · sampled{" "}
              {formatTimeLabel(diagnostics.weather.sampledAt)}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Playback buffer</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {diagnostics.playbackFrameCount} frames · {diagnostics.playbackWindowMinutes} min
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              {diagnostics.playbackResolutionSeconds}s resolution · last capture{" "}
              {formatTimeLabel(diagnostics.latestPlaybackCapturedAt)}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white/70 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Alerts and AI</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {diagnostics.activeAlerts} active · latest alert{" "}
              {formatTimeLabel(diagnostics.latestAlertRaisedAt)}
            </p>
            <p className="mt-2 text-sm leading-7 text-muted">
              Distress parsing: {diagnostics.distress.providerMode}
              {diagnostics.distress.model
                ? ` (${diagnostics.distress.model})`
                : " fallback parser"}{" "}
              · latest event {formatTimeLabel(diagnostics.latestEventOccurredAt)}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-7 text-muted">
          Loading runtime telemetry, playback depth, and external-service mode.
        </p>
      )}
    </SectionCard>
  );
}
