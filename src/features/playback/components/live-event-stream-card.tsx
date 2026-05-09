import { SectionCard } from "@/components/shell/section-card";
import type { PlaybackEvent } from "@/types/playback";

type LiveEventStreamCardProps = {
  events: PlaybackEvent[];
};

const kindLabels = {
  alert: "Alert",
  directive: "Directive",
  response: "Response",
  "status-change": "Status",
} as const;

export function LiveEventStreamCard({ events }: LiveEventStreamCardProps) {
  return (
    <SectionCard
      title="Operational stream"
      description="Recent directive, response, and alert activity from the authoritative runtime appears here for every connected client."
    >
      <div className="grid gap-3">
        {events.length > 0 ? (
          events.slice(0, 8).map((event) => (
            <article
              key={event.id}
              className="rounded-2xl border border-line bg-white/70 p-4 shadow-sm shadow-slate-900/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                    {kindLabels[event.kind]}
                  </span>
                  {event.severity ? (
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
                      {event.severity}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">
                  {new Date(event.occurredAt).toLocaleTimeString()}
                </p>
              </div>
              <p className="mt-3 text-sm leading-7 text-foreground">{event.summary}</p>
            </article>
          ))
        ) : (
          <p className="text-sm leading-7 text-muted">
            No directive or response events have been emitted yet.
          </p>
        )}
      </div>
    </SectionCard>
  );
}
