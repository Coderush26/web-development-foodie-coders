"use client";

import { SectionCard } from "@/components/shell/section-card";
import { FleetSelectionList } from "@/features/fleet/components/fleet-selection-list";
import { LiveSystemBar } from "@/features/fleet/components/live-system-bar";
import { ShipDetailsCard } from "@/features/fleet/components/ship-details-card";
import { useInterpolatedFleetView } from "@/features/fleet/hooks/use-interpolated-fleet-view";
import { FleetMap } from "@/features/map/components/fleet-map";

export function CommandLiveDashboard() {
  const {
    snapshot,
    displayShips,
    selectedShip,
    selectedShipId,
    setSelectedShipId,
    connectionState,
    error,
  } = useInterpolatedFleetView();

  return (
    <>
      <LiveSystemBar
        roleLabel="Command"
        connectionState={connectionState}
        snapshot={snapshot}
        highlightedShip={selectedShip}
      />

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <SectionCard
          title="Fleet map"
          description="The command surface now uses the live authoritative feed as its main interaction layer. Click any ship to inspect it."
        >
          {error ? <p className="mb-4 text-sm leading-7 text-accent-strong">{error}</p> : null}
          <FleetMap
            role="command"
            ships={displayShips}
            selectedShipId={selectedShipId}
            onSelectShip={setSelectedShipId}
          />
        </SectionCard>

        <div className="grid gap-6">
          <ShipDetailsCard ship={selectedShip} roleLabel="Command" />
          <FleetSelectionList
            ships={displayShips}
            selectedShipId={selectedShipId}
            onSelectShip={setSelectedShipId}
          />
        </div>
      </div>
    </>
  );
}
