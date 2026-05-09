"use client";

import { SectionCard } from "@/components/shell/section-card";
import { AlertCenter } from "@/features/alerts/components/alert-center";
import { useAlertAudio } from "@/features/alerts/hooks/use-alert-audio";
import { LiveSystemBar } from "@/features/fleet/components/live-system-bar";
import { ShipDetailsCard } from "@/features/fleet/components/ship-details-card";
import { useInterpolatedFleetView } from "@/features/fleet/hooks/use-interpolated-fleet-view";
import { FleetMap } from "@/features/map/components/fleet-map";
import { haversineDistanceKm } from "@/lib/geo/navigation";

type CaptainLiveDashboardProps = {
  shipId: string;
};

export function CaptainLiveDashboard({ shipId }: CaptainLiveDashboardProps) {
  const { snapshot, displayShips, selectedShip, connectionState, error } =
    useInterpolatedFleetView(shipId);

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

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <SectionCard
          title="Bridge map"
          description="Your vessel stays in focus while restricted zones and the rest of the fleet remain visible as shared context."
        >
          {error ? <p className="mb-4 text-sm leading-7 text-accent-strong">{error}</p> : null}
          <FleetMap
            role="captain"
            ships={displayShips}
            zones={snapshot?.zones ?? []}
            selectedShipId={shipId}
            captainShipId={shipId}
          />
        </SectionCard>

        <div className="grid gap-6">
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
        </div>
      </div>
    </>
  );
}
