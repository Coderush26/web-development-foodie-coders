"use client";

import { useEffect, useRef } from "react";

import type { LatLngBoundsExpression, Map as LeafletMap } from "leaflet";
import { useMap } from "react-leaflet";

import { getFleetScenarioSeed, getPortById } from "@/features/fleet/data/scenario-seed";
import type { FleetDisplayShip } from "@/features/fleet/hooks/use-interpolated-fleet-view";
import type { GeoPoint } from "@/types/fleet";

const scenarioSeed = getFleetScenarioSeed();

export type FleetMapPresentationMode = "standard" | "expanded";

export function toLatLng(point: GeoPoint): [number, number] {
  return [point.lat, point.lng];
}

export function getFleetBounds(): LatLngBoundsExpression {
  return [
    [scenarioSeed.bounds.south, scenarioSeed.bounds.west],
    [scenarioSeed.bounds.north, scenarioSeed.bounds.east],
  ];
}

export function getCaptainBounds(ship: FleetDisplayShip): LatLngBoundsExpression {
  const destination = getPortById(ship.destinationPortId)?.position;
  const latitudes = [ship.displayPosition.lat, destination?.lat ?? ship.displayPosition.lat];
  const longitudes = [ship.displayPosition.lng, destination?.lng ?? ship.displayPosition.lng];

  return [
    [Math.min(...latitudes) - 0.45, Math.min(...longitudes) - 0.45],
    [Math.max(...latitudes) + 0.45, Math.max(...longitudes) + 0.45],
  ];
}

function animateToShip(map: LeafletMap, role: "command" | "captain", ship: FleetDisplayShip) {
  map.flyTo(
    toLatLng(ship.displayPosition),
    role === "captain" ? 8.2 : Math.max(map.getZoom(), 7.4),
    {
      animate: true,
      duration: 0.95,
      easeLinearity: 0.25,
    }
  );
}

function fitScenarioView(
  map: LeafletMap,
  role: "command" | "captain",
  ship: FleetDisplayShip | null
) {
  const bounds = role === "captain" && ship ? getCaptainBounds(ship) : getFleetBounds();

  map.fitBounds(bounds, {
    animate: true,
    duration: 0.95,
    easeLinearity: 0.25,
    padding: [40, 40],
  });
}

type FleetMapViewportControllerProps = {
  role: "command" | "captain";
  ship: FleetDisplayShip | null;
  followSelection: boolean;
  presentationMode: FleetMapPresentationMode;
};

export function FleetMapViewportController({
  role,
  ship,
  followSelection,
  presentationMode,
}: FleetMapViewportControllerProps) {
  const map = useMap();
  const previousShipIdRef = useRef<string | null>(null);
  const lastFollowAtRef = useRef(0);

  useEffect(() => {
    map.invalidateSize({ pan: false });
  }, [map, presentationMode]);

  useEffect(() => {
    if (!ship) {
      return;
    }

    const shipPoint = toLatLng(ship.displayPosition);
    const shipChanged = previousShipIdRef.current !== ship.shipId;

    if (shipChanged) {
      previousShipIdRef.current = ship.shipId;
      animateToShip(map, role, ship);
      return;
    }

    if (!followSelection || map.getBounds().pad(-0.22).contains(shipPoint)) {
      return;
    }

    const now = performance.now();

    if (now - lastFollowAtRef.current < 800) {
      return;
    }

    lastFollowAtRef.current = now;
    animateToShip(map, role, ship);
  }, [followSelection, map, role, ship]);

  return null;
}

type FleetMapViewportControlsProps = {
  role: "command" | "captain";
  ship: FleetDisplayShip | null;
  followSelection: boolean;
  onToggleFollowSelection: () => void;
};

export function FleetMapViewportControls({
  role,
  ship,
  followSelection,
  onToggleFollowSelection,
}: FleetMapViewportControlsProps) {
  const map = useMap();
  const roleLabel = role === "captain" ? "Bridge tracking" : "Command tracking";

  return (
    <div className="fleet-map-toolbar">
      <div className="fleet-map-toolbar__meta">
        <p className="fleet-map-toolbar__eyebrow">{roleLabel}</p>
        <p className="fleet-map-toolbar__title">{ship ? ship.name : "Operational theater"}</p>
      </div>
      <div className="fleet-map-toolbar__actions">
        <button
          type="button"
          className="fleet-map-toolbar__button"
          onClick={() => {
            if (ship) {
              animateToShip(map, role, ship);
              return;
            }

            fitScenarioView(map, role, ship);
          }}
        >
          Focus
        </button>
        <button
          type="button"
          className="fleet-map-toolbar__button"
          onClick={() => fitScenarioView(map, role, ship)}
        >
          {role === "captain" ? "Fit route" : "Fit fleet"}
        </button>
        <button
          type="button"
          className={`fleet-map-toolbar__button ${followSelection ? "fleet-map-toolbar__button--active" : ""}`}
          onClick={onToggleFollowSelection}
        >
          {followSelection ? "Follow on" : "Follow off"}
        </button>
        <button
          type="button"
          className="fleet-map-toolbar__button fleet-map-toolbar__button--compact"
          aria-label="Zoom in"
          onClick={() => map.zoomIn(0.5)}
        >
          +
        </button>
        <button
          type="button"
          className="fleet-map-toolbar__button fleet-map-toolbar__button--compact"
          aria-label="Zoom out"
          onClick={() => map.zoomOut(0.5)}
        >
          -
        </button>
      </div>
    </div>
  );
}
