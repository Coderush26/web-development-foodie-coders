"use client";

import type { FleetControlCommand } from "@/types/control";
import type { FleetRuntimeSnapshot } from "@/types/realtime";

const FLEET_CONTROL_PATH = "/api/fleet/control";

export async function sendFleetControlCommand(command: FleetControlCommand) {
  const response = await fetch(FLEET_CONTROL_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        snapshot: FleetRuntimeSnapshot;
      }
    | {
        message: string;
      }
    | null;

  if (!response.ok) {
    throw new Error(
      payload && "message" in payload ? payload.message : "Fleet control request failed."
    );
  }

  if (!payload || !("snapshot" in payload)) {
    throw new Error("Fleet control response was incomplete.");
  }

  return payload.snapshot;
}
