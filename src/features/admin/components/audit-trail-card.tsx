import { SectionCard } from "@/components/shell/section-card";
import type { AuditLogRecord } from "@/server/auth/audit";

type AuditTrailCardProps = {
  entries: AuditLogRecord[];
};

function formatActionLabel(action: string) {
  return action
    .split(".")
    .map((segment) => segment.replace(/_/g, " "))
    .join(" / ");
}

function formatMetadataValue(value: string | number | boolean | null) {
  if (value === null) {
    return "n/a";
  }

  if (typeof value === "boolean") {
    return value ? "yes" : "no";
  }

  return String(value);
}

export function AuditTrailCard({ entries }: AuditTrailCardProps) {
  return (
    <SectionCard
      title="Audit trail"
      description="Recent protected-mode and live-operations actions, so the owner can review who changed what."
    >
      {entries.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-white/65 p-5 text-sm leading-7 text-muted">
          Audit records appear here after members sign in, sign out, or change live operational
          state.
        </div>
      ) : (
        <div className="grid gap-4">
          {entries.map((entry) => {
            const metadataEntries = Object.entries(entry.metadata ?? {});

            return (
              <article
                key={entry.id}
                className="rounded-3xl border border-line bg-white/75 p-5 shadow-sm shadow-slate-900/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {entry.actorName ?? entry.actorUserId ?? "System"}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {entry.targetType}
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold uppercase tracking-[0.16em] text-muted">
                  {formatActionLabel(entry.action)}
                </p>

                <p className="mt-2 text-sm leading-7 text-muted">
                  Target:{" "}
                  <span className="font-semibold text-foreground">
                    {entry.targetId ?? "system"}
                  </span>
                </p>

                {metadataEntries.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {metadataEntries.map(([key, value]) => (
                      <span
                        key={`${entry.id}-${key}`}
                        className="rounded-full border border-line bg-surface-muted px-3 py-1 text-xs font-semibold text-muted"
                      >
                        {key}: {formatMetadataValue(value)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
