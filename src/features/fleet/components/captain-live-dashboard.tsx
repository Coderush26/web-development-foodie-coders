"use client";

import { SectionCard } from "@/components/shell/section-card";
import { AlertCenter } from "@/features/alerts/components/alert-center";
import { useAlertAudio } from "@/features/alerts/hooks/use-alert-audio";
import { CaptainDirectiveInbox } from "@/features/captain/components/captain-directive-inbox";
import { useFleetCaptainControls } from "@/features/captain/hooks/use-fleet-captain-controls";
import { LiveSystemBar } from "@/features/fleet/components/live-system-bar";
import { ShipDetailsCard } from "@/features/fleet/components/ship-details-card";
import { useInterpolatedFleetView } from "@/features/fleet/hooks/use-interpolated-fleet-view";
import { FleetMap } from "@/features/map/components/fleet-map";
import { LiveEventStreamCard } from "@/features/playback/components/live-event-stream-card";
import { haversineDistanceKm } from "@/lib/geo/navigation";

type CaptainLiveDashboardProps = {
  shipId: string;
};

export function CaptainLiveDashboard({ shipId }: CaptainLiveDashboardProps) {
  const { snapshot, displayShips, selectedShip, connectionState, error } =
    useInterpolatedFleetView(shipId);
  const {
    acceptDirective,
    escalateDirective,
    pendingDirectiveId,
    error: captainControlError,
  } = useFleetCaptainControls();

  useAlertAudio(snapshot?.alerts ?? []);

  const nearbyShips = selectedShip
    ? displayShips
        .filter((ship) => ship.shipId !== shipId)
        .map((ship) => ({
          ...ship,
          distanceKm: haversineDistanceKm(selectedShip.displayPosition, ship.displayPosition),
        }))
        .sort((left, right) => left.distanceKm - right.distanceKm)
        .slice(0, 4)
    : [];

  return (
    <>
      <LiveSystemBar
        roleLabel="Captain"
        connectionState={connectionState}
        snapshot={snapshot}
        highlightedShip={selectedShip}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(22rem,0.82fr)] 2xl:grid-cols-[minmax(0,1.85fr)_minmax(23rem,0.78fr)]">
        <SectionCard
          title="Bridge map"
          tone="accent"
          description="Your vessel stays in focus while restricted zones and nearby traffic remain visible. Use the map toolbar to refocus, follow live movement, or open the expanded bridge view."
        >
          {[error, captainControlError].filter(Boolean).length > 0 ? (
            <div className="mb-4 grid gap-2">
              {[error, captainControlError].filter(Boolean).map((message) => (
                <p key={message} className="text-sm leading-7 text-accent-strong">
                  {message}
                </p>
              ))}
            </div>
          ) : null}
          <FleetMap
            role="captain"
            ships={displayShips}
            zones={snapshot?.zones ?? []}
            weather={snapshot?.weather ?? null}
            selectedShipId={shipId}
            captainShipId={shipId}
          />
        </SectionCard>

        <div className="grid gap-6">
          <CaptainDirectiveInbox
            shipId={shipId}
            directives={snapshot?.directives ?? []}
            captainResponses={snapshot?.captainResponses ?? []}
            pendingDirectiveId={pendingDirectiveId}
            onAcceptDirective={acceptDirective}
            onEscalateDirective={escalateDirective}
          />
          <AlertCenter alerts={snapshot?.alerts ?? []} role="captain" />
          <ShipDetailsCard ship={selectedShip} roleLabel="Captain" />

          <SectionCard
            title="Nearby fleet context"
            description="Captains stay scoped to their own ship, but nearby traffic is still visible for situational awareness."
          >
            <div className="grid gap-3">
              {nearbyShips.length > 0 ? (
                nearbyShips.map((ship) => (
                  <div key={ship.shipId} className="rounded-2xl border border-line bg-white/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
                          {ship.shipId}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-foreground">{ship.name}</p>
                      </div>
                      <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                        {ship.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-muted">
                      {ship.distanceKm.toFixed(2)} km away at {ship.speedKnots.toFixed(1)} knots.
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-muted">Waiting for nearby ship context.</p>
              )}
            </div>
          </SectionCard>

          <LiveEventStreamCard events={snapshot?.events ?? []} />
        </div>
      </div>
    </>
  );
}
