"use client";

import { useEffect, useRef, useState } from "react";

import { useFleetStream } from "@/lib/realtime/use-fleet-stream";
import type { GeoPoint } from "@/types/fleet";
import type { FleetRuntimeSnapshot, FleetShipRuntimeSnapshot } from "@/types/realtime";

export interface FleetDisplayShip extends FleetShipRuntimeSnapshot {
  displayPosition: GeoPoint;
}

type TransitionState = {
  startedAt: number;
  durationMs: number;
  targetSnapshot: FleetRuntimeSnapshot;
  fromPositions: Map<string, GeoPoint>;
};

function interpolatePoint(origin: GeoPoint, destination: GeoPoint, progress: number): GeoPoint {
  return {
    lat: origin.lat + (destination.lat - origin.lat) * progress,
    lng: origin.lng + (destination.lng - origin.lng) * progress,
  };
}

function toPositionMap(ships: FleetDisplayShip[] | FleetShipRuntimeSnapshot[]) {
  return new Map(
    ships.map((ship) => [
      ship.shipId,
      "displayPosition" in ship ? ship.displayPosition : ship.position,
    ])
  );
}

function buildDisplayShips(
  snapshot: FleetRuntimeSnapshot,
  fromPositions: Map<string, GeoPoint>,
  progress: number
) {
  return snapshot.ships.map<FleetDisplayShip>((ship) => ({
    ...ship,
    displayPosition: interpolatePoint(
      fromPositions.get(ship.shipId) ?? ship.position,
      ship.position,
      progress
    ),
  }));
}

export function useInterpolatedFleetView(shipId?: string) {
  const { snapshot, connectionState, error } = useFleetStream(shipId);
  const [displayShips, setDisplayShips] = useState<FleetDisplayShip[]>([]);
  const [selectedShipId, setSelectedShipId] = useState<string | null>(shipId ?? null);

  const frameRef = useRef<number | null>(null);
  const transitionRef = useRef<TransitionState | null>(null);
  const displayShipsRef = useRef<FleetDisplayShip[]>([]);

  useEffect(() => {
    displayShipsRef.current = displayShips;
  }, [displayShips]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    const fallbackPositions = toPositionMap(snapshot.ships);
    const fromPositions =
      displayShipsRef.current.length > 0
        ? toPositionMap(displayShipsRef.current)
        : fallbackPositions;

    transitionRef.current = {
      startedAt: performance.now(),
      durationMs: Math.max(snapshot.tickIntervalMs, 1),
      targetSnapshot: snapshot,
      fromPositions,
    };

    const animate = (frameAt: number) => {
      const transition = transitionRef.current;

      if (!transition) {
        return;
      }

      const elapsedMs = frameAt - transition.startedAt;
      const progress = Math.min(1, elapsedMs / transition.durationMs);
      const nextShips = buildDisplayShips(
        transition.targetSnapshot,
        transition.fromPositions,
        progress
      );

      setDisplayShips(nextShips);

      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(animate);
      } else {
        frameRef.current = null;
      }
    };

    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [snapshot]);

  const effectiveSelectedShipId =
    shipId ??
    (selectedShipId && snapshot?.ships.some((ship) => ship.shipId === selectedShipId)
      ? selectedShipId
      : (snapshot?.ships[0]?.shipId ?? null));

  const selectedShip = effectiveSelectedShipId
    ? (displayShips.find((ship) => ship.shipId === effectiveSelectedShipId) ?? null)
    : null;

  return {
    snapshot,
    displayShips,
    selectedShip,
    selectedShipId: effectiveSelectedShipId,
    setSelectedShipId,
    connectionState,
    error,
  };
}
