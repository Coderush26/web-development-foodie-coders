import { SectionCard } from "@/components/shell/section-card";
import type { PlaybackFrame, PlaybackHistoryPayload } from "@/types/playback";

type PlaybackTimelineCardProps = {
  playbackHistory: PlaybackHistoryPayload | null;
  playbackMode: "live" | "playback";
  selectedFrame: PlaybackFrame | null;
  selectedFrameIndex: number;
  onSelectFrameIndex: (index: number) => void;
  onSetPlaybackMode: (mode: "live" | "playback") => void;
  onJumpToLive: () => void;
};

function formatFrameTime(timestamp: string | null) {
  return timestamp ? new Date(timestamp).toLocaleTimeString() : "Awaiting history";
}

export function PlaybackTimelineCard({
  playbackHistory,
  playbackMode,
  selectedFrame,
  selectedFrameIndex,
  onSelectFrameIndex,
  onSetPlaybackMode,
  onJumpToLive,
}: PlaybackTimelineCardProps) {
  const frames = playbackHistory?.frames ?? [];
  const sliderValue = selectedFrameIndex >= 0 ? selectedFrameIndex : Math.max(frames.length - 1, 0);

  return (
    <SectionCard
      title="Playback review"
      description="Command can scrub the last hour of captured fleet state without touching the live authoritative simulation."
      tone={playbackMode === "playback" ? "accent" : "default"}
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onJumpToLive}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
              playbackMode === "live"
                ? "border-accent/20 bg-emerald-50 text-accent"
                : "border-line bg-white/80 text-muted"
            }`}
          >
            Live mode
          </button>
          <button
            type="button"
            onClick={() => onSetPlaybackMode("playback")}
            disabled={frames.length === 0}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
              playbackMode === "playback"
                ? "border-accent-strong/20 bg-orange-50 text-accent-strong"
                : "border-line bg-white/80 text-muted"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            Playback mode
          </button>
        </div>

        <div className="grid gap-2 rounded-2xl border border-line bg-white/70 p-4 text-sm text-muted">
          <p className="font-semibold uppercase tracking-[0.18em] text-foreground">
            {playbackMode === "playback"
              ? `Reviewing ${formatFrameTime(selectedFrame?.capturedAt ?? null)}`
              : "Live simulation remains active"}
          </p>
          <p>
            {playbackMode === "playback"
              ? "Playback mode is read-only. Return to live mode before issuing directives or acknowledging alerts."
              : "Open playback mode to freeze the map and inspect historical ship positions, alerts, and events."}
          </p>
        </div>

        {frames.length > 0 ? (
          <>
            <div className="grid gap-3 rounded-2xl border border-line bg-white/70 p-4">
              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-semibold uppercase tracking-[0.16em] text-muted">
                  Timeline scrubber
                </span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(frames.length - 1, 0)}
                  value={sliderValue}
                  onChange={(event) => onSelectFrameIndex(Number(event.target.value))}
                />
              </label>
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted">
                <span>{formatFrameTime(frames[0]?.capturedAt ?? null)}</span>
                <span>{formatFrameTime(frames.at(-1)?.capturedAt ?? null)}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-line bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Frame</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {Math.max(sliderValue + 1, 1)} / {frames.length}
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Frame events</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {selectedFrame?.events.length ?? 0}
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-white/70 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Active alerts</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {selectedFrame?.alerts.filter((alert) => alert.state === "active").length ?? 0}
                </p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm leading-7 text-muted">
            Playback history is still warming up. The server captures one authoritative frame every
            30 seconds.
          </p>
        )}
      </div>
    </SectionCard>
  );
}
