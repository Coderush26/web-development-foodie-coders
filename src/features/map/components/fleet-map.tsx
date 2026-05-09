"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import type { FleetMapCanvasProps } from "@/features/map/components/fleet-map-canvas";
import type { FleetMapPresentationMode } from "@/features/map/components/fleet-map-viewport";

const FleetMapCanvas = dynamic(
  () =>
    import("@/features/map/components/fleet-map-canvas").then((module) => module.FleetMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-104 items-center justify-center bg-background-strong/70 text-sm text-muted lg:min-h-136">
        Loading interactive map surface...
      </div>
    ),
  }
);

export function FleetMap(props: FleetMapCanvasProps) {
  const [presentationMode, setPresentationMode] = useState<FleetMapPresentationMode>("standard");
  const [followSelection, setFollowSelection] = useState(props.role === "captain");

  useEffect(() => {
    if (presentationMode !== "expanded") {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPresentationMode("standard");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [presentationMode]);

  const selectedShip = useMemo(
    () => props.ships.find((ship) => ship.shipId === props.selectedShipId) ?? null,
    [props.selectedShipId, props.ships]
  );

  const isExpanded = presentationMode === "expanded";

  return (
    <>
      {isExpanded ? <div className="fixed inset-0 z-40 bg-slate-950/42 backdrop-blur-sm" /> : null}
      <div className={isExpanded ? "fixed inset-4 z-50" : "relative h-full"}>
        <div className="fleet-map-surface relative overflow-hidden rounded-[1.9rem] border border-line bg-background-strong/70">
          <div className="fleet-map-surface__bar pointer-events-none absolute inset-x-4 top-4 z-[500] flex flex-wrap items-start justify-between gap-3">
            <div className="pointer-events-auto flex flex-wrap gap-2">
              <span className="fleet-map-surface__chip">
                {props.role === "captain" ? "Bridge view" : "Fleet theater"}
              </span>
              <span className="fleet-map-surface__chip fleet-map-surface__chip--muted">
                {selectedShip ? `Focused on ${selectedShip.name}` : "Select a ship to focus it"}
              </span>
            </div>
            <button
              type="button"
              className="fleet-map-surface__toggle pointer-events-auto"
              onClick={() => setPresentationMode(isExpanded ? "standard" : "expanded")}
            >
              {isExpanded ? "Close expanded view" : "Open expanded view"}
            </button>
          </div>
          <FleetMapCanvas
            {...props}
            followSelection={followSelection}
            onToggleFollowSelection={() => setFollowSelection((current) => !current)}
            presentationMode={presentationMode}
          />
        </div>
      </div>
    </>
  );
}
