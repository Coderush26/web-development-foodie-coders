"use client";

import { SectionCard } from "@/components/shell/section-card";
import { AlertCenter } from "@/features/alerts/components/alert-center";
import { useAlertAudio } from "@/features/alerts/hooks/use-alert-audio";
import { DirectiveControlCard } from "@/features/command/components/directive-control-card";
import { RuntimeDiagnosticsCard } from "@/features/command/components/runtime-diagnostics-card";
import { useFleetCommandControls } from "@/features/command/hooks/use-fleet-command-controls";
import { FleetSelectionList } from "@/features/fleet/components/fleet-selection-list";
import { LiveSystemBar } from "@/features/fleet/components/live-system-bar";
import { ShipDetailsCard } from "@/features/fleet/components/ship-details-card";
import { FleetMap } from "@/features/map/components/fleet-map";
import { LiveEventStreamCard } from "@/features/playback/components/live-event-stream-card";
import { PlaybackTimelineCard } from "@/features/playback/components/playback-timeline-card";
import { useCommandPlaybackView } from "@/features/playback/hooks/use-command-playback-view";

export function CommandLiveDashboard() {
  const {
    displayShips,
    selectedShip,
    selectedShipId,
    setSelectedShipId,
    connectionState,
    error,
    liveSnapshot,
    playbackError,
    playbackHistory,
    playbackMode,
    isPlaybackMode,
    selectedFrame,
    selectedFrameIndex,
    selectPlaybackFrame,
    jumpToLive,
    activeZones,
    activeWeather,
    activeAlerts,
    activeEvents,
    activeCapturedAt,
  } = useCommandPlaybackView();
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

  useAlertAudio(liveSnapshot?.alerts ?? []);

  const errors = [error, playbackError, controlError].filter(Boolean);
  const playbackCapturedAtLabel = activeCapturedAt
    ? new Date(activeCapturedAt).toLocaleTimeString()
    : "the selected frame";

  return (
    <>
      <LiveSystemBar
        roleLabel="Command"
        connectionState={connectionState}
        snapshot={liveSnapshot}
        highlightedShip={selectedShip}
      />

      {isPlaybackMode ? (
        <div className="mt-4 rounded-2xl border border-accent-strong/20 bg-orange-50/80 px-4 py-3 text-sm text-accent-strong">
          Playback review is active. The live simulation is still running in the background, but
          this view is frozen at {playbackCapturedAtLabel} until you return to live mode.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        <SectionCard
          title="Fleet map"
          description={
            isPlaybackMode
              ? "Playback mode freezes the fleet map at the selected historical frame. Historical routes, alerts, and weather remain visible, while live controls stay disabled."
              : "The command surface uses the live authoritative feed as its main interaction layer. Draw, edit, or remove restricted zones directly on the map and click ships to inspect them."
          }
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
            zones={activeZones}
            weather={activeWeather}
            readOnly={isPlaybackMode}
            selectedShipId={selectedShipId}
            onSelectShip={setSelectedShipId}
            onCreateZone={createZone}
            onUpdateZone={updateZone}
            onDeleteZone={deleteZone}
          />
        </SectionCard>

        <div className="grid gap-6">
          <PlaybackTimelineCard
            playbackHistory={playbackHistory}
            playbackMode={playbackMode}
            selectedFrame={selectedFrame}
            selectedFrameIndex={selectedFrameIndex}
            onSelectFrameIndex={selectPlaybackFrame}
            onSetPlaybackMode={() => selectPlaybackFrame(Math.max(selectedFrameIndex, 0))}
            onJumpToLive={jumpToLive}
          />
          <RuntimeDiagnosticsCard />
          {isPlaybackMode ? (
            <SectionCard
              title="Playback controls"
              description="Historical review is intentionally read-only so the live simulation cannot be mutated while you scrub the last hour."
            >
              <p className="text-sm leading-7 text-muted">
                Return to live mode to issue directives, edit restricted zones, or acknowledge
                alerts.
              </p>
            </SectionCard>
          ) : (
            <DirectiveControlCard
              selectedShip={selectedShip}
              directives={liveSnapshot?.directives ?? []}
              isPending={isDirectivePending}
              onIssueDirective={issueDirective}
            />
          )}
          <AlertCenter
            alerts={activeAlerts}
            role="command"
            readOnly={isPlaybackMode}
            descriptionOverride={
              isPlaybackMode
                ? "Historical alert state for the selected playback frame. Review-only mode keeps the live alert pipeline untouched."
                : undefined
            }
            emptyMessage={
              isPlaybackMode ? "No alerts were active in the selected playback window." : undefined
            }
            pendingAlertId={pendingAlertId}
            onAcknowledge={acknowledgeAlert}
            onResolve={resolveAlert}
          />
          <ShipDetailsCard
            ship={selectedShip}
            roleLabel="Command"
            mode={isPlaybackMode ? "playback" : "live"}
          />
          <FleetSelectionList
            ships={displayShips}
            selectedShipId={selectedShipId}
            onSelectShip={setSelectedShipId}
          />
          <LiveEventStreamCard
            events={activeEvents}
            title={isPlaybackMode ? "Historical event stream" : undefined}
            description={
              isPlaybackMode
                ? "Recent alert, directive, response, and status events leading into the selected playback frame appear here."
                : undefined
            }
            emptyMessage={
              isPlaybackMode
                ? "No key events were captured near the selected playback frame."
                : undefined
            }
          />
        </div>
      </div>
    </>
  );
}
