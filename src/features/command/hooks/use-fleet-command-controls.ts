"use client";

import { useState } from "react";

import { sendFleetControlCommand } from "@/lib/realtime/fleet-control";
import type { FleetControlCommand } from "@/types/control";
import type { RestrictedZoneDraft } from "@/types/zones";

type BusyKey = "zone" | `alert:${string}` | null;

export function useFleetCommandControls() {
  const [busyKey, setBusyKey] = useState<BusyKey>(null);
  const [error, setError] = useState<string | null>(null);

  async function runCommand(command: FleetControlCommand, nextBusyKey: BusyKey) {
    setBusyKey(nextBusyKey);
    setError(null);

    try {
      await sendFleetControlCommand(command);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Fleet control action failed.");
    } finally {
      setBusyKey(null);
    }
  }

  return {
    createZone: (zone: RestrictedZoneDraft) => runCommand({ type: "zone.create", zone }, "zone"),
    updateZone: (zoneId: string, zone: RestrictedZoneDraft) =>
      runCommand({ type: "zone.update", zoneId, zone }, "zone"),
    deleteZone: (zoneId: string) => runCommand({ type: "zone.delete", zoneId }, "zone"),
    acknowledgeAlert: (alertId: string) =>
      runCommand({ type: "alert.acknowledge", alertId }, `alert:${alertId}`),
    resolveAlert: (alertId: string) =>
      runCommand({ type: "alert.resolve", alertId }, `alert:${alertId}`),
    isZonePending: busyKey === "zone",
    pendingAlertId: busyKey?.startsWith("alert:") ? busyKey.slice(6) : null,
    error,
  };
}
