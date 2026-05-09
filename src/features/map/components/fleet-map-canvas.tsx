"use client";

import { useEffect, useRef } from "react";

import { divIcon, type LatLngBoundsExpression } from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

import { getFleetScenarioSeed, getPortById } from "@/features/fleet/data/scenario-seed";
import { FleetOperationalOverlays } from "@/features/map/components/fleet-operational-overlays";
import type { FleetDisplayShip } from "@/features/fleet/hooks/use-interpolated-fleet-view";
import { RestrictedZoneControls } from "@/features/map/components/restricted-zone-controls";
import type { GeoPoint } from "@/types/fleet";
import type { WeatherSnapshot } from "@/types/weather";
import type { RestrictedZone, RestrictedZoneDraft } from "@/types/zones";

export type FleetMapCanvasProps = {
  role: "command" | "captain";
  ships: FleetDisplayShip[];
  zones?: RestrictedZone[];
  weather?: WeatherSnapshot | null;
  selectedShipId: string | null;
  onSelectShip?: (shipId: string) => void;
  onCreateZone?: (zone: RestrictedZoneDraft) => void | Promise<void>;
  onUpdateZone?: (zoneId: string, zone: RestrictedZoneDraft) => void | Promise<void>;
  onDeleteZone?: (zoneId: string) => void | Promise<void>;
  captainShipId?: string;
};

const scenarioSeed = getFleetScenarioSeed();

function toLatLng(point: GeoPoint): [number, number] {
  return [point.lat, point.lng];
}

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
    html: `<span class="${classNames}"></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function getFleetBounds(): LatLngBoundsExpression {
  return [
    [scenarioSeed.bounds.south, scenarioSeed.bounds.west],
    [scenarioSeed.bounds.north, scenarioSeed.bounds.east],
  ];
}

function getCaptainBounds(ship: FleetDisplayShip): LatLngBoundsExpression {
  const destination = getPortById(ship.destinationPortId)?.position;
  const latitudes = [ship.displayPosition.lat, destination?.lat ?? ship.displayPosition.lat];
  const longitudes = [ship.displayPosition.lng, destination?.lng ?? ship.displayPosition.lng];

  return [
    [Math.min(...latitudes) - 0.45, Math.min(...longitudes) - 0.45],
    [Math.max(...latitudes) + 0.45, Math.max(...longitudes) + 0.45],
  ];
}

function CommandSelectionController({ ship }: { ship: FleetDisplayShip | null }) {
  const map = useMap();
  const previousShipIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ship) {
      return;
    }

    if (previousShipIdRef.current === ship.shipId) {
      return;
    }

    previousShipIdRef.current = ship.shipId;

    map.flyTo(toLatLng(ship.displayPosition), Math.max(map.getZoom(), 7), {
      duration: 0.75,
    });
  }, [map, ship]);

  return null;
}

function CaptainFollowController({ ship }: { ship: FleetDisplayShip | null }) {
  const map = useMap();
  const lastPanAtRef = useRef(0);

  useEffect(() => {
    if (!ship) {
      return;
    }

    const shipPoint = toLatLng(ship.displayPosition);

    if (map.getBounds().pad(-0.18).contains(shipPoint)) {
      return;
    }

    const now = performance.now();

    if (now - lastPanAtRef.current < 600) {
      return;
    }

    lastPanAtRef.current = now;
    map.panTo(shipPoint, { animate: true, duration: 0.8 });
  }, [map, ship]);

  return null;
}

export function FleetMapCanvas({
  role,
  ships,
  zones = [],
  weather,
  selectedShipId,
  onSelectShip,
  onCreateZone,
  onUpdateZone,
  onDeleteZone,
  captainShipId,
}: FleetMapCanvasProps) {
  const selectedShip = ships.find((ship) => ship.shipId === selectedShipId) ?? null;
  const initialBounds =
    role === "captain" && selectedShip ? getCaptainBounds(selectedShip) : getFleetBounds();

  return (
    <MapContainer
      bounds={initialBounds}
      className="fleet-map h-104 w-full lg:h-136"
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

      <FleetOperationalOverlays
        role={role}
        ships={ships}
        weather={weather}
        selectedShipId={selectedShipId}
        captainShipId={captainShipId}
      />

      <RestrictedZoneControls
        role={role}
        zones={zones}
        onCreateZone={onCreateZone}
        onUpdateZone={onUpdateZone}
        onDeleteZone={onDeleteZone}
      />

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

      {role === "command" ? (
        <CommandSelectionController ship={selectedShip} />
      ) : (
        <CaptainFollowController ship={selectedShip} />
      )}
    </MapContainer>
  );
}
