"use client";

import { useEffect, useState } from "react";

import { gradingThresholds } from "@/config/scenario";
import {
  useInterpolatedFleetView,
  type FleetDisplayShip,
} from "@/features/fleet/hooks/use-interpolated-fleet-view";
import type { PlaybackEvent, PlaybackFrame, PlaybackHistoryPayload } from "@/types/playback";

const PLAYBACK_HISTORY_PATH = "/api/fleet/playback";

type PlaybackMode = "live" | "playback";

function sortEvents(events: PlaybackEvent[]) {
  return [...events].sort(
    (left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt)
  );
}

function toPlaybackDisplayShips(frame: PlaybackFrame) {
  return frame.ships.map<FleetDisplayShip>((ship) => ({
    ...ship,
    displayPosition: ship.position,
  }));
}

function buildPlaybackContextEvents(frames: PlaybackFrame[], selectedFrameIndex: number) {
  if (selectedFrameIndex < 0) {
    return [];
  }

  return sortEvents(
    frames
      .slice(Math.max(0, selectedFrameIndex - 4), selectedFrameIndex + 1)
      .flatMap((frame) => frame.events)
  );
}

export function useCommandPlaybackView() {
  const liveView = useInterpolatedFleetView();
  const [playbackHistory, setPlaybackHistory] = useState<PlaybackHistoryPayload | null>(null);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>("live");
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPlaybackHistory() {
      try {
        const response = await fetch(PLAYBACK_HISTORY_PATH, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Playback request failed with ${response.status}`);
        }

        const payload = (await response.json()) as PlaybackHistoryPayload;

        if (!active) {
          return;
        }

        setPlaybackHistory(payload);
        setPlaybackError(null);
        setSelectedFrameId((current) => {
          const latestFrameId = payload.frames.at(-1)?.id ?? null;

          if (playbackMode === "live") {
            return latestFrameId;
          }

          return current && payload.frames.some((frame) => frame.id === current)
            ? current
            : latestFrameId;
        });
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setPlaybackError(
          caughtError instanceof Error ? caughtError.message : "Failed to load playback history."
        );
      }
    }

    void loadPlaybackHistory();

    const intervalId = window.setInterval(() => {
      void loadPlaybackHistory();
    }, gradingThresholds.playbackResolutionSeconds * 1000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [playbackMode]);

  const playbackFrames = playbackHistory?.frames ?? [];
  const selectedFrame =
    playbackFrames.find((frame) => frame.id === selectedFrameId) ?? playbackFrames.at(-1) ?? null;
  const selectedFrameIndex = selectedFrame
    ? playbackFrames.findIndex((frame) => frame.id === selectedFrame.id)
    : -1;
  const playbackShips = selectedFrame ? toPlaybackDisplayShips(selectedFrame) : [];
  const isPlaybackMode = playbackMode === "playback" && Boolean(selectedFrame);
  const displayShips = isPlaybackMode ? playbackShips : liveView.displayShips;
  const selectedShipId = liveView.selectedShipId ?? displayShips[0]?.shipId ?? null;
  const selectedShip = selectedShipId
    ? (displayShips.find((ship) => ship.shipId === selectedShipId) ?? null)
    : null;

  function selectPlaybackFrame(index: number) {
    const frame = playbackFrames[index];

    if (!frame) {
      return;
    }

    setSelectedFrameId(frame.id);
    setPlaybackMode("playback");
  }

  function jumpToLive() {
    setPlaybackMode("live");
    setSelectedFrameId(playbackFrames.at(-1)?.id ?? null);
  }

  return {
    liveSnapshot: liveView.snapshot,
    displayShips,
    selectedShip,
    selectedShipId,
    setSelectedShipId: liveView.setSelectedShipId,
    connectionState: liveView.connectionState,
    error: liveView.error,
    playbackError,
    playbackHistory,
    playbackMode,
    isPlaybackMode,
    selectedFrame,
    selectedFrameIndex,
    selectPlaybackFrame,
    jumpToLive,
    activeZones: isPlaybackMode ? (selectedFrame?.zones ?? []) : (liveView.snapshot?.zones ?? []),
    activeWeather: isPlaybackMode
      ? (selectedFrame?.weather ?? null)
      : (liveView.snapshot?.weather ?? null),
    activeAlerts: isPlaybackMode
      ? (selectedFrame?.alerts ?? [])
      : (liveView.snapshot?.alerts ?? []),
    activeEvents: isPlaybackMode
      ? buildPlaybackContextEvents(playbackFrames, selectedFrameIndex)
      : (liveView.snapshot?.events ?? []),
    activeCapturedAt: isPlaybackMode
      ? (selectedFrame?.capturedAt ?? null)
      : (liveView.snapshot?.generatedAt ?? null),
  };
}
