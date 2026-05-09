"use client";

import { useState } from "react";

import { sendFleetControlCommand } from "@/lib/realtime/fleet-control";

type BusyKey = `directive:${string}` | null;

export function useFleetCaptainControls() {
  const [busyKey, setBusyKey] = useState<BusyKey>(null);
  const [error, setError] = useState<string | null>(null);

  async function runDirectiveCommand(
    command:
      | {
          type: "directive.accept";
          directiveId: string;
        }
      | {
          type: "directive.escalate-distress";
          directiveId: string;
          distressMessage: string;
        },
    directiveId: string
  ) {
    setBusyKey(`directive:${directiveId}`);
    setError(null);

    try {
      await sendFleetControlCommand(command);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Captain action failed.");
    } finally {
      setBusyKey(null);
    }
  }

  return {
    acceptDirective: (directiveId: string) =>
      runDirectiveCommand({ type: "directive.accept", directiveId }, directiveId),
    escalateDirective: (directiveId: string, distressMessage: string) =>
      runDirectiveCommand(
        {
          type: "directive.escalate-distress",
          directiveId,
          distressMessage,
        },
        directiveId
      ),
    pendingDirectiveId: busyKey?.slice(10) ?? null,
    error,
  };
}
