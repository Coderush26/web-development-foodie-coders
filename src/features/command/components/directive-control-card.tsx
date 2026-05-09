"use client";

import { useState } from "react";

import { SectionCard } from "@/components/shell/section-card";
import { getFleetScenarioSeed } from "@/features/fleet/data/scenario-seed";
import type { FleetDisplayShip } from "@/features/fleet/hooks/use-interpolated-fleet-view";
import type { FleetDirective } from "@/types/directives";
import type { GeoPoint } from "@/types/fleet";

type DirectiveControlCardProps = {
  selectedShip: FleetDisplayShip | null;
  directives: FleetDirective[];
  isPending: boolean;
  onIssueDirective: (input: {
    shipId: string;
    directiveType: "reroute-port" | "divert-waypoint" | "hold-position";
    targetPortId?: string;
    waypoint?: GeoPoint;
    note?: string;
  }) => void | Promise<void>;
};

const scenarioSeed = getFleetScenarioSeed();

function describeDirectiveTarget(directive: FleetDirective) {
  if (directive.type === "reroute-port") {
    return directive.targetPortId ?? "alternate port";
  }

  if (directive.type === "divert-waypoint" && directive.waypoint) {
    return `${directive.waypoint.lat.toFixed(3)}, ${directive.waypoint.lng.toFixed(3)}`;
  }

  return "hold position";
}

export function DirectiveControlCard({
  selectedShip,
  directives,
  isPending,
  onIssueDirective,
}: DirectiveControlCardProps) {
  const [directiveType, setDirectiveType] = useState<
    "reroute-port" | "divert-waypoint" | "hold-position"
  >("reroute-port");
  const [targetPortId, setTargetPortId] = useState("");
  const [waypointLat, setWaypointLat] = useState("");
  const [waypointLng, setWaypointLng] = useState("");
  const [note, setNote] = useState("");

  const shipDirectives = selectedShip
    ? directives.filter((directive) => directive.shipId === selectedShip.shipId).slice(0, 4)
    : [];
  const portOptions = scenarioSeed.ports.filter(
    (port) => port.id !== selectedShip?.destinationPortId
  );
  const effectiveTargetPortId =
    targetPortId && portOptions.some((port) => port.id === targetPortId)
      ? targetPortId
      : (portOptions[0]?.id ?? "");

  async function handleSubmit(formData: FormData) {
    if (!selectedShip) {
      return;
    }

    const nextDirectiveType = formData.get("directiveType");

    if (
      nextDirectiveType !== "reroute-port" &&
      nextDirectiveType !== "divert-waypoint" &&
      nextDirectiveType !== "hold-position"
    ) {
      return;
    }

    const command = {
      shipId: selectedShip.shipId,
      directiveType: nextDirectiveType,
      note: note.trim() || undefined,
    } as {
      shipId: string;
      directiveType: "reroute-port" | "divert-waypoint" | "hold-position";
      targetPortId?: string;
      waypoint?: GeoPoint;
      note?: string;
    };

    if (nextDirectiveType === "reroute-port") {
      if (!effectiveTargetPortId) {
        return;
      }

      command.targetPortId = effectiveTargetPortId;
    }

    if (nextDirectiveType === "divert-waypoint") {
      const lat = Number(waypointLat);
      const lng = Number(waypointLng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      command.waypoint = { lat, lng };
    }

    await onIssueDirective(command);
    setNote("");
  }

  return (
    <SectionCard
      title="Directive control"
      description="Command can reroute to a new port, divert through a waypoint, or order a hold. Accepted directives apply on the next server tick."
      tone="accent"
    >
      {selectedShip ? (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-line bg-white/70 p-4">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
              {selectedShip.shipId}
            </p>
            <p className="mt-2 text-lg font-semibold text-foreground">{selectedShip.name}</p>
            <p className="mt-2 text-sm leading-7 text-muted">
              Current intent: {selectedShip.intent.type}. Current destination:{" "}
              {selectedShip.destinationPortId}.
            </p>
          </div>

          <form action={handleSubmit} className="grid gap-4">
            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted">
                Directive type
              </span>
              <select
                name="directiveType"
                value={directiveType}
                onChange={(event) => setDirectiveType(event.target.value as typeof directiveType)}
                className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground"
              >
                <option value="reroute-port">Reroute to port</option>
                <option value="divert-waypoint">Divert to waypoint</option>
                <option value="hold-position">Hold position</option>
              </select>
            </label>

            {directiveType === "reroute-port" ? (
              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-semibold uppercase tracking-[0.16em] text-muted">
                  Target port
                </span>
                <select
                  value={effectiveTargetPortId}
                  onChange={(event) => setTargetPortId(event.target.value)}
                  className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground"
                >
                  {portOptions.map((port) => (
                    <option key={port.id} value={port.id}>
                      {port.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {directiveType === "divert-waypoint" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-foreground">
                  <span className="font-semibold uppercase tracking-[0.16em] text-muted">
                    Waypoint latitude
                  </span>
                  <input
                    value={waypointLat}
                    onChange={(event) => setWaypointLat(event.target.value)}
                    placeholder={selectedShip.displayPosition.lat.toFixed(4)}
                    className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground"
                  />
                </label>
                <label className="grid gap-2 text-sm text-foreground">
                  <span className="font-semibold uppercase tracking-[0.16em] text-muted">
                    Waypoint longitude
                  </span>
                  <input
                    value={waypointLng}
                    onChange={(event) => setWaypointLng(event.target.value)}
                    placeholder={selectedShip.displayPosition.lng.toFixed(4)}
                    className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground"
                  />
                </label>
              </div>
            ) : null}

            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted">
                Operator note
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Reason for the directive or any bridge instructions"
                className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground"
              />
            </label>

            <button
              type="submit"
              disabled={isPending}
              className="rounded-full border border-accent/20 bg-emerald-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Sending..." : "Send directive"}
            </button>
          </form>

          <div className="grid gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Recent directives for this ship
            </p>
            {shipDirectives.length > 0 ? (
              shipDirectives.map((directive) => (
                <div key={directive.id} className="rounded-2xl border border-line bg-white/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{directive.type}</p>
                      <p className="mt-1 text-sm text-muted">
                        {describeDirectiveTarget(directive)}
                      </p>
                    </div>
                    <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      {directive.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">
                    Issued {new Date(directive.issuedAt).toLocaleTimeString()}
                    {directive.appliedAt
                      ? ` · Applied ${new Date(directive.appliedAt).toLocaleTimeString()}`
                      : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-7 text-muted">No directives sent to this ship yet.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm leading-7 text-muted">
          Select a ship to send directives and inspect its directive history.
        </p>
      )}
    </SectionCard>
  );
}
