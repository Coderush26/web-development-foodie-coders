import assert from "node:assert/strict";
import test from "node:test";

import { gradingThresholds } from "@/config/scenario";
import { createPlaybackHistoryState, recordPlaybackSnapshot } from "@/server/playback/history";
import { createInitialFleetSnapshot } from "@/server/simulation/engine";
import type { PlaybackEvent } from "@/types/playback";

function createPlaybackEvent(summary: string, occurredAt: string): PlaybackEvent {
  return {
    id: `${summary}-${occurredAt}`,
    kind: "status-change",
    occurredAt,
    shipIds: ["MV-1"],
    summary,
  };
}

test("captures buffered events into the next 30-second playback frame", () => {
  const initialSnapshot = createInitialFleetSnapshot();
  let historyState = createPlaybackHistoryState(initialSnapshot);
  const bufferedEvent = createPlaybackEvent(
    "MV-1 changed status from normal to rerouting.",
    new Date(Date.parse(initialSnapshot.generatedAt) + 15_000).toISOString()
  );

  historyState = recordPlaybackSnapshot(
    historyState,
    {
      ...initialSnapshot,
      generatedAt: new Date(Date.parse(initialSnapshot.generatedAt) + 15_000).toISOString(),
    },
    [bufferedEvent]
  );

  assert.equal(historyState.payload.frames.length, 1);
  assert.equal(historyState.bufferedEvents.length, 1);

  historyState = recordPlaybackSnapshot(
    historyState,
    {
      ...initialSnapshot,
      generatedAt: new Date(Date.parse(initialSnapshot.generatedAt) + 30_000).toISOString(),
      sequence: initialSnapshot.sequence + 1,
    },
    []
  );

  const capturedFrame = historyState.payload.frames.at(-1);

  assert.ok(capturedFrame, "Expected a playback frame to be captured after 30 seconds.");
  assert.equal(historyState.payload.frames.length, 2);
  assert.equal(historyState.bufferedEvents.length, 0);
  assert.equal(capturedFrame?.events.length, 1);
  assert.equal(capturedFrame?.events[0]?.summary, bufferedEvent.summary);
});

test("keeps only the last hour of playback frames", () => {
  const initialSnapshot = createInitialFleetSnapshot();
  let historyState = createPlaybackHistoryState(initialSnapshot);
  const frameLimit =
    (gradingThresholds.playbackWindowMinutes * 60) / gradingThresholds.playbackResolutionSeconds;

  for (let index = 1; index <= frameLimit + 5; index += 1) {
    historyState = recordPlaybackSnapshot(
      historyState,
      {
        ...initialSnapshot,
        generatedAt: new Date(
          Date.parse(initialSnapshot.generatedAt) +
            index * gradingThresholds.playbackResolutionSeconds * 1000
        ).toISOString(),
        sequence: initialSnapshot.sequence + index,
      },
      []
    );
  }

  assert.equal(historyState.payload.frames.length, frameLimit);
  assert.equal(
    historyState.payload.frames[0]?.sequence,
    initialSnapshot.sequence + 6,
    "Expected the oldest frames to roll off once the one-hour window is full."
  );
});
