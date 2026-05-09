import { randomUUID } from "node:crypto";

import { gradingThresholds } from "@/config/scenario";
import type {
  PlaybackEvent,
  PlaybackFrame,
  PlaybackHistoryPayload,
  PlaybackShipSnapshot,
} from "@/types/playback";
import type { FleetRuntimeSnapshot } from "@/types/realtime";

const PLAYBACK_CAPTURE_MS = gradingThresholds.playbackResolutionSeconds * 1000;
const PLAYBACK_FRAME_LIMIT =
  (gradingThresholds.playbackWindowMinutes * 60) / gradingThresholds.playbackResolutionSeconds;

export type PlaybackHistoryState = {
  payload: PlaybackHistoryPayload;
  bufferedEvents: PlaybackEvent[];
  lastCapturedAt: string;
};

function clonePoint(point: { lat: number; lng: number }) {
  return {
    lat: point.lat,
    lng: point.lng,
  };
}

function cloneShip(ship: FleetRuntimeSnapshot["ships"][number]): PlaybackShipSnapshot {
  return {
    ...ship,
    position: clonePoint(ship.position),
    intent: ship.intent.waypoint
      ? {
          ...ship.intent,
          waypoint: clonePoint(ship.intent.waypoint),
        }
      : { ...ship.intent },
    routePlan: {
      ...ship.routePlan,
      points: ship.routePlan.points.map(clonePoint),
    },
    weatherState: { ...ship.weatherState },
  };
}

function cloneAlert(alert: FleetRuntimeSnapshot["alerts"][number]) {
  return {
    ...alert,
    affectedShipIds: [...alert.affectedShipIds],
    metadata: alert.metadata ? { ...alert.metadata } : undefined,
  };
}

function cloneZone(zone: FleetRuntimeSnapshot["zones"][number]) {
  return {
    ...zone,
    points: zone.points.map(clonePoint),
  };
}

function cloneWeather(weather: FleetRuntimeSnapshot["weather"]) {
  if (!weather) {
    return null;
  }

  return {
    ...weather,
    cells: weather.cells.map((cell) => ({
      ...cell,
      center: clonePoint(cell.center),
    })),
  };
}

function cloneEvent(event: PlaybackEvent) {
  return {
    ...event,
    shipIds: [...event.shipIds],
  };
}

function sortEvents(events: PlaybackEvent[]) {
  return [...events].sort(
    (left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt)
  );
}

function createPlaybackFrame(
  snapshot: FleetRuntimeSnapshot,
  events: PlaybackEvent[]
): PlaybackFrame {
  return {
    id: randomUUID(),
    capturedAt: snapshot.generatedAt,
    sequence: snapshot.sequence,
    ships: snapshot.ships.map(cloneShip),
    zones: snapshot.zones.map(cloneZone),
    alerts: snapshot.alerts.map(cloneAlert),
    weather: cloneWeather(snapshot.weather),
    events: sortEvents(events).map(cloneEvent),
  };
}

export function createPlaybackHistoryState(snapshot: FleetRuntimeSnapshot): PlaybackHistoryState {
  return {
    payload: {
      windowMinutes: gradingThresholds.playbackWindowMinutes,
      resolutionSeconds: gradingThresholds.playbackResolutionSeconds,
      frames: [createPlaybackFrame(snapshot, [])],
    },
    bufferedEvents: [],
    lastCapturedAt: snapshot.generatedAt,
  };
}

export function recordPlaybackSnapshot(
  state: PlaybackHistoryState,
  snapshot: FleetRuntimeSnapshot,
  newEvents: PlaybackEvent[]
): PlaybackHistoryState {
  const bufferedEvents = sortEvents([...state.bufferedEvents, ...newEvents]);

  if (Date.parse(snapshot.generatedAt) - Date.parse(state.lastCapturedAt) < PLAYBACK_CAPTURE_MS) {
    return {
      ...state,
      bufferedEvents,
    };
  }

  return {
    payload: {
      ...state.payload,
      frames: [...state.payload.frames, createPlaybackFrame(snapshot, bufferedEvents)].slice(
        -PLAYBACK_FRAME_LIMIT
      ),
    },
    bufferedEvents: [],
    lastCapturedAt: snapshot.generatedAt,
  };
}
