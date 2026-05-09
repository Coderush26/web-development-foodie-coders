"use client";

import { Circle, Polyline, Tooltip } from "react-leaflet";

import type { FleetDisplayShip } from "@/features/fleet/hooks/use-interpolated-fleet-view";
import type { GeoPoint } from "@/types/fleet";
import type { WeatherCell, WeatherSnapshot } from "@/types/weather";

type FleetOperationalOverlaysProps = {
  role: "command" | "captain";
  ships: FleetDisplayShip[];
  weather?: WeatherSnapshot | null;
  selectedShipId: string | null;
  captainShipId?: string;
};

function toLatLng(point: GeoPoint): [number, number] {
  return [point.lat, point.lng];
}

function resolveVisibleRouteShips(
  ships: FleetDisplayShip[],
  role: FleetOperationalOverlaysProps["role"],
  captainShipId?: string
) {
  if (role === "captain") {
    return ships.filter((ship) => ship.shipId === captainShipId);
  }

  return ships;
}

function resolveRouteStyle(ship: FleetDisplayShip, isHighlighted: boolean) {
  if (ship.routePlan.status === "blocked" || ship.status === "stranded") {
    return {
      color: "#c2410c",
      opacity: isHighlighted ? 0.95 : 0.55,
      weight: isHighlighted ? 4.4 : 2.8,
      dashArray: "4 7",
    };
  }

  if (ship.routePlan.status === "rerouting") {
    return {
      color: "#0369a1",
      opacity: isHighlighted ? 0.95 : 0.45,
      weight: isHighlighted ? 4.2 : 2.5,
      dashArray: "7 9",
    };
  }

  return {
    color: "#0f766e",
    opacity: isHighlighted ? 0.9 : 0.25,
    weight: isHighlighted ? 4 : 2,
    dashArray: undefined,
  };
}

function resolveWeatherCircleStyle(cell: WeatherCell) {
  if (cell.severity === "adverse") {
    return {
      color: "#c2410c",
      fillColor: "#fdba74",
      fillOpacity: 0.18,
      radiusMeters: 24_000,
    };
  }

  return {
    color: "#0369a1",
    fillColor: "#7dd3fc",
    fillOpacity: 0.12,
    radiusMeters: 18_000,
  };
}

export function FleetOperationalOverlays({
  role,
  ships,
  weather,
  selectedShipId,
  captainShipId,
}: FleetOperationalOverlaysProps) {
  const visibleRouteShips = resolveVisibleRouteShips(ships, role, captainShipId);
  const weatherCells = weather?.cells.filter((cell) => cell.severity !== "clear") ?? [];

  return (
    <>
      {weatherCells.map((cell) => {
        const style = resolveWeatherCircleStyle(cell);

        return (
          <Circle
            key={cell.id}
            center={toLatLng(cell.center)}
            radius={style.radiusMeters}
            pathOptions={{
              color: style.color,
              fillColor: style.fillColor,
              fillOpacity: style.fillOpacity,
              opacity: 0.5,
              weight: 1.4,
            }}
          >
            <Tooltip direction="top">
              {`${cell.severity} weather · ${cell.windSpeedKnots.toFixed(1)} kn wind · ${cell.waveHeightMeters.toFixed(1)} m waves`}
            </Tooltip>
          </Circle>
        );
      })}

      {visibleRouteShips.map((ship) => {
        if (ship.routePlan.points.length === 0) {
          return null;
        }

        const positions = [ship.displayPosition, ...ship.routePlan.points].map(toLatLng);
        const style = resolveRouteStyle(ship, ship.shipId === selectedShipId);

        return (
          <Polyline key={`route-${ship.shipId}`} positions={positions} pathOptions={style}>
            <Tooltip direction="top">
              {`${ship.name} route · ${ship.routePlan.status} · ${ship.routePlan.totalDistanceKm.toFixed(1)} km`}
            </Tooltip>
          </Polyline>
        );
      })}
    </>
  );
}
