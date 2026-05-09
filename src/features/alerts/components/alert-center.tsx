import { SectionCard } from "@/components/shell/section-card";
import type { FleetAlert } from "@/types/alerts";

type AlertCenterProps = {
  alerts: FleetAlert[];
  role: "command" | "captain";
  readOnly?: boolean;
  descriptionOverride?: string;
  emptyMessage?: string;
  pendingAlertId?: string | null;
  onAcknowledge?: (alertId: string) => void | Promise<void>;
  onResolve?: (alertId: string) => void | Promise<void>;
};

const severityClasses = {
  info: "bg-slate-100 text-slate-700",
  warning: "bg-amber-100 text-amber-800",
  critical: "bg-orange-100 text-orange-800",
} as const;

const stateClasses = {
  active: "bg-orange-100 text-orange-800",
  acknowledged: "bg-emerald-100 text-emerald-800",
  resolved: "bg-slate-100 text-slate-700",
} as const;

const stateRank = {
  active: 0,
  acknowledged: 1,
  resolved: 2,
} as const;

function formatTime(timestamp: string | undefined) {
  return timestamp ? new Date(timestamp).toLocaleTimeString() : null;
}

function buildAlertMeta(alert: FleetAlert) {
  const zoneName = typeof alert.metadata?.zoneName === "string" ? alert.metadata.zoneName : null;
  const shipId = typeof alert.metadata?.shipId === "string" ? alert.metadata.shipId : null;

  return [zoneName, shipId].filter(Boolean).join(" · ");
}

export function AlertCenter({
  alerts,
  role,
  readOnly = false,
  descriptionOverride,
  emptyMessage = "No active operational alerts are open right now.",
  pendingAlertId,
  onAcknowledge,
  onResolve,
}: AlertCenterProps) {
  const activeAlerts = alerts.filter((alert) => alert.state === "active");
  const orderedAlerts = [...alerts].sort((left, right) => {
    const stateDifference = stateRank[left.state] - stateRank[right.state];

    if (stateDifference !== 0) {
      return stateDifference;
    }

    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });
  const cardTone = activeAlerts.some((alert) => alert.severity === "critical")
    ? "warning"
    : activeAlerts.length > 0
      ? "accent"
      : "default";

  return (
    <SectionCard
      title="Alert center"
      description={
        (descriptionOverride ?? role === "command")
          ? "Shared geofence, routing, weather, and proximity alerts land here first. Command can acknowledge or resolve them as the situation changes."
          : "Captains see the same operational alert stream, while acknowledgement stays on the command surface."
      }
      tone={cardTone}
    >
      <div className="grid gap-3" aria-live="polite">
        {orderedAlerts.length > 0 ? (
          orderedAlerts.map((alert) => {
            const metaLabel = buildAlertMeta(alert);
            const isPending = pendingAlertId === alert.id;

            return (
              <article
                key={alert.id}
                className="rounded-2xl border border-line bg-white/75 p-4 shadow-sm shadow-slate-900/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${severityClasses[alert.severity]}`}
                      >
                        {alert.severity}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${stateClasses[alert.state]}`}
                      >
                        {alert.state}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-foreground">{alert.title}</h3>
                    {metaLabel ? (
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-accent">
                        {metaLabel}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted">
                    Raised {formatTime(alert.createdAt)}
                  </p>
                </div>

                <p className="mt-3 text-sm leading-7 text-muted">{alert.message}</p>

                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-muted">
                  {alert.acknowledgedAt
                    ? `Acknowledged ${formatTime(alert.acknowledgedAt)}`
                    : "Awaiting acknowledgement"}
                  {alert.resolvedAt ? ` · Resolved ${formatTime(alert.resolvedAt)}` : ""}
                </p>

                {role === "command" && !readOnly ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onAcknowledge?.(alert.id)}
                      disabled={alert.state !== "active" || isPending}
                      className="action-button-light rounded-full border border-accent bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] shadow-sm shadow-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPending && alert.state === "active" ? "Working..." : "Acknowledge"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onResolve?.(alert.id)}
                      disabled={alert.state === "resolved" || isPending}
                      className="action-button-light rounded-full border border-accent-strong bg-accent-strong px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] shadow-sm shadow-orange-900/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPending && alert.state !== "active" ? "Working..." : "Resolve"}
                    </button>
                  </div>
                ) : (
                  <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted">
                    {readOnly
                      ? "Playback mode is read-only. Return to live mode to acknowledge or resolve alerts."
                      : "Command owns acknowledgement and resolution."}
                  </p>
                )}
              </article>
            );
          })
        ) : (
          <p className="text-sm leading-7 text-muted">{emptyMessage}</p>
        )}
      </div>
    </SectionCard>
  );
}
