"use client";

import { divIcon, type LatLngBoundsExpression } from "leaflet";
import { CircleMarker, MapContainer, Marker, Polygon, TileLayer, Tooltip } from "react-leaflet";

import { getFleetScenarioSeed } from "@/features/fleet/data/scenario-seed";
import { FleetOperationalOverlays } from "@/features/map/components/fleet-operational-overlays";
import {
  FleetMapViewportController,
  FleetMapViewportControls,
  getCaptainBounds,
  getFleetBounds,
  toLatLng,
  type FleetMapPresentationMode,
} from "@/features/map/components/fleet-map-viewport";
import type { FleetDisplayShip } from "@/features/fleet/hooks/use-interpolated-fleet-view";
import { RestrictedZoneControls } from "@/features/map/components/restricted-zone-controls";
import type { WeatherSnapshot } from "@/types/weather";
import type { RestrictedZone, RestrictedZoneDraft } from "@/types/zones";

export type FleetMapCanvasProps = {
  role: "command" | "captain";
  ships: FleetDisplayShip[];
  zones?: RestrictedZone[];
  weather?: WeatherSnapshot | null;
  readOnly?: boolean;
  selectedShipId: string | null;
  onSelectShip?: (shipId: string) => void;
  onCreateZone?: (zone: RestrictedZoneDraft) => void | Promise<void>;
  onUpdateZone?: (zoneId: string, zone: RestrictedZoneDraft) => void | Promise<void>;
  onDeleteZone?: (zoneId: string) => void | Promise<void>;
  captainShipId?: string;
  followSelection?: boolean;
  onToggleFollowSelection?: () => void;
  presentationMode?: FleetMapPresentationMode;
};

const scenarioSeed = getFleetScenarioSeed();

function createShipIcon(isSelected: boolean, isCaptainOwned: boolean, isCaptainContext: boolean) {
  const classNames = [
    "fleet-ship-marker",
    isSelected ? "fleet-ship-marker--selected" : "",
    isCaptainOwned ? "fleet-ship-marker--owned" : "",
    isCaptainContext ? "fleet-ship-marker--context" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return divIcon({
    className: "fleet-ship-marker-wrapper",
    html: `<span class="${classNames}"><span class="fleet-ship-marker__pulse"></span><span class="fleet-ship-marker__core"></span></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export function FleetMapCanvas({
  role,
  ships,
  zones = [],
  weather,
  readOnly = false,
  selectedShipId,
  onSelectShip,
  onCreateZone,
  onUpdateZone,
  onDeleteZone,
  captainShipId,
  followSelection = role === "captain",
  onToggleFollowSelection,
  presentationMode = "standard",
}: FleetMapCanvasProps) {
  const selectedShip = ships.find((ship) => ship.shipId === selectedShipId) ?? null;
  const initialBounds =
    role === "captain" && selectedShip ? getCaptainBounds(selectedShip) : getFleetBounds();
  const mapHeightClass =
    presentationMode === "expanded"
      ? "fleet-map h-full min-h-[75vh] w-full"
      : "fleet-map h-[32rem] w-full lg:h-[44rem] 2xl:h-[50rem]";

  return (
    <MapContainer
      bounds={initialBounds}
      className={mapHeightClass}
      maxBounds={getFleetBounds() as LatLngBoundsExpression}
      maxBoundsViscosity={0.85}
      minZoom={6.25}
      maxZoom={10.75}
      zoomControl={false}
      zoomDelta={0.5}
      zoomSnap={0.25}
      wheelPxPerZoomLevel={160}
      scrollWheelZoom
      preferCanvas
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
      />

      <Polygon
        positions={scenarioSeed.navigableWater.map(toLatLng)}
        pathOptions={{ color: "#0f766e", fillColor: "#d7ece8", fillOpacity: 0.24, weight: 2 }}
      />

      <FleetMapViewportControls
        role={role}
        ship={selectedShip}
        followSelection={followSelection}
        onToggleFollowSelection={onToggleFollowSelection ?? (() => undefined)}
      />

      <FleetOperationalOverlays
        role={role}
        ships={ships}
        weather={weather}
        selectedShipId={selectedShipId}
        captainShipId={captainShipId}
      />

      {!readOnly ? (
        <RestrictedZoneControls
          role={role}
          zones={zones}
          onCreateZone={onCreateZone}
          onUpdateZone={onUpdateZone}
          onDeleteZone={onDeleteZone}
        />
      ) : null}

      {scenarioSeed.ports.map((port) => (
        <CircleMarker
          key={port.id}
          center={toLatLng(port.position)}
          radius={5}
          pathOptions={{ color: "#c2410c", fillColor: "#c2410c", fillOpacity: 0.95, weight: 1 }}
        >
          <Tooltip direction="top" offset={[0, -4]}>
            {port.name}
          </Tooltip>
        </CircleMarker>
      ))}

      {ships.map((ship) => {
        const isSelected = ship.shipId === selectedShipId;
        const isCaptainOwned = captainShipId === ship.shipId;
        const isCaptainContext = role === "captain" && !isCaptainOwned;
        const isInteractive = role === "command" || isCaptainOwned;

        return (
          <Marker
            key={ship.shipId}
            position={toLatLng(ship.displayPosition)}
            icon={createShipIcon(isSelected, isCaptainOwned, isCaptainContext)}
            eventHandlers={
              isInteractive && onSelectShip
                ? {
                    click: () => onSelectShip(ship.shipId),
                  }
                : undefined
            }
          >
            <Tooltip direction="top" offset={[0, -10]}>
              {ship.name}
            </Tooltip>
          </Marker>
        );
      })}

      <FleetMapViewportController
        role={role}
        ship={selectedShip}
        followSelection={followSelection}
        presentationMode={presentationMode}
      />
    </MapContainer>
  );
}
