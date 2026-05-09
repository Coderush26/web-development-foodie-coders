"use client";

import { AlertCenter } from "@/features/alerts/components/alert-center";
import { useAlertAudio } from "@/features/alerts/hooks/use-alert-audio";
import { DirectiveControlCard } from "@/features/command/components/directive-control-card";
import { useFleetCommandControls } from "@/features/command/hooks/use-fleet-command-controls";
import { SectionCard } from "@/components/shell/section-card";
import { FleetSelectionList } from "@/features/fleet/components/fleet-selection-list";
import { LiveSystemBar } from "@/features/fleet/components/live-system-bar";
import { ShipDetailsCard } from "@/features/fleet/components/ship-details-card";
import { useInterpolatedFleetView } from "@/features/fleet/hooks/use-interpolated-fleet-view";
import { FleetMap } from "@/features/map/components/fleet-map";
import { LiveEventStreamCard } from "@/features/playback/components/live-event-stream-card";

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
  const {
    createZone,
    updateZone,
    deleteZone,
    issueDirective,
    acknowledgeAlert,
    resolveAlert,
    pendingAlertId,
    isDirectivePending,
    error: controlError,
  } = useFleetCommandControls();

  useAlertAudio(snapshot?.alerts ?? []);

  const errors = [error, controlError].filter(Boolean);

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
          description="The command surface uses the live authoritative feed as its main interaction layer. Draw, edit, or remove restricted zones directly on the map and click ships to inspect them."
        >
          {errors.length > 0 ? (
            <div className="mb-4 grid gap-2">
              {errors.map((message) => (
                <p key={message} className="text-sm leading-7 text-accent-strong">
                  {message}
                </p>
              ))}
            </div>
          ) : null}
          <FleetMap
            role="command"
            ships={displayShips}
            zones={snapshot?.zones ?? []}
            selectedShipId={selectedShipId}
            onSelectShip={setSelectedShipId}
            onCreateZone={createZone}
            onUpdateZone={updateZone}
            onDeleteZone={deleteZone}
          />
        </SectionCard>

        <div className="grid gap-6">
          <DirectiveControlCard
            selectedShip={selectedShip}
            directives={snapshot?.directives ?? []}
            isPending={isDirectivePending}
            onIssueDirective={issueDirective}
          />
          <AlertCenter
            alerts={snapshot?.alerts ?? []}
            role="command"
            pendingAlertId={pendingAlertId}
            onAcknowledge={acknowledgeAlert}
            onResolve={resolveAlert}
          />
          <ShipDetailsCard ship={selectedShip} roleLabel="Command" />
          <FleetSelectionList
            ships={displayShips}
            selectedShipId={selectedShipId}
            onSelectShip={setSelectedShipId}
          />
          <LiveEventStreamCard events={snapshot?.events ?? []} />
        </div>
      </div>
    </>
  );
}
