"use client";

import { useMemo, useState } from "react";

import { SectionCard } from "@/components/shell/section-card";
import type { CaptainResponse, FleetDirective } from "@/types/directives";

type CaptainDirectiveInboxProps = {
  shipId: string;
  directives: FleetDirective[];
  captainResponses: CaptainResponse[];
  pendingDirectiveId?: string | null;
  onAcceptDirective: (directiveId: string) => void | Promise<void>;
  onEscalateDirective: (directiveId: string, distressMessage: string) => void | Promise<void>;
};

function describeDirectiveTarget(directive: FleetDirective) {
  if (directive.type === "reroute-port") {
    return directive.targetPortId ?? "alternate port";
  }

  if (directive.type === "divert-waypoint" && directive.waypoint) {
    return `${directive.waypoint.lat.toFixed(3)}, ${directive.waypoint.lng.toFixed(3)}`;
  }

  return "Hold current position";
}

export function CaptainDirectiveInbox({
  shipId,
  directives,
  captainResponses,
  pendingDirectiveId,
  onAcceptDirective,
  onEscalateDirective,
}: CaptainDirectiveInboxProps) {
  const [draftMessages, setDraftMessages] = useState<Record<string, string>>({});

  const responsesById = useMemo(
    () => new Map(captainResponses.map((response) => [response.id, response])),
    [captainResponses]
  );
  const shipDirectives = directives
    .filter((directive) => directive.shipId === shipId)
    .sort((left, right) => {
      if (left.status === "pending" && right.status !== "pending") {
        return -1;
      }

      if (right.status === "pending" && left.status !== "pending") {
        return 1;
      }

      return Date.parse(right.issuedAt) - Date.parse(left.issuedAt);
    });

  return (
    <SectionCard
      title="Captain inbox"
      description="Directive responses go back to Command immediately. ACCEPT changes course on the next server tick, while distress escalation creates a structured alert."
      tone="accent"
    >
      <div className="grid gap-4">
        {shipDirectives.length > 0 ? (
          shipDirectives.map((directive) => {
            const response = directive.captainResponseId
              ? responsesById.get(directive.captainResponseId)
              : undefined;
            const distressMessage = draftMessages[directive.id] ?? "";
            const isPending = pendingDirectiveId === directive.id;

            return (
              <article
                key={directive.id}
                className="rounded-2xl border border-line bg-white/70 p-4 shadow-sm shadow-slate-900/5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                      {directive.type}
                    </p>
                    <p className="mt-2 text-sm text-muted">{describeDirectiveTarget(directive)}</p>
                  </div>
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {directive.status}
                  </span>
                </div>

                {directive.note ? (
                  <p className="mt-3 text-sm leading-7 text-muted">{directive.note}</p>
                ) : null}

                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">
                  Issued {new Date(directive.issuedAt).toLocaleTimeString()}
                  {directive.appliedAt
                    ? ` · Applied ${new Date(directive.appliedAt).toLocaleTimeString()}`
                    : ""}
                </p>

                {response?.distressAssessment ? (
                  <div className="mt-3 rounded-2xl border border-accent-strong/20 bg-orange-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-strong">
                      Distress extraction
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {response.distressAssessment.summary}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">
                      {response.distressAssessment.severity} ·{" "}
                      {response.distressAssessment.issueType}
                      {response.distressAssessment.quantifiedImpact
                        ? ` · ${response.distressAssessment.quantifiedImpact}`
                        : ""}
                    </p>
                  </div>
                ) : null}

                {directive.status === "pending" ? (
                  <div className="mt-4 grid gap-3">
                    <textarea
                      value={distressMessage}
                      onChange={(event) =>
                        setDraftMessages((current) => ({
                          ...current,
                          [directive.id]: event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="If you cannot comply, explain the distress in free form so the system can structure it."
                      className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onAcceptDirective(directive.id)}
                        disabled={isPending}
                        className="action-button-light rounded-full border border-accent bg-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] shadow-sm shadow-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPending ? "Working..." : "Accept"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEscalateDirective(directive.id, distressMessage)}
                        disabled={isPending || distressMessage.trim().length === 0}
                        className="action-button-light rounded-full border border-accent-strong bg-accent-strong px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] shadow-sm shadow-orange-900/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPending ? "Working..." : "Escalate distress"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <p className="text-sm leading-7 text-muted">
            No directives have been assigned to this ship yet.
          </p>
        )}
      </div>
    </SectionCard>
  );
}
