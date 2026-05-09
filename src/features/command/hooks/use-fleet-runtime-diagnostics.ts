"use client";

import { useEffect, useState } from "react";

import type { FleetRuntimeDiagnostics } from "@/types/diagnostics";

const DIAGNOSTICS_PATH = "/api/fleet/diagnostics";
const DIAGNOSTICS_REFRESH_MS = 5_000;

export function useFleetRuntimeDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<FleetRuntimeDiagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadDiagnostics() {
      try {
        const response = await fetch(DIAGNOSTICS_PATH, { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Diagnostics request failed with ${response.status}`);
        }

        const payload = (await response.json()) as FleetRuntimeDiagnostics;

        if (!active) {
          return;
        }

        setDiagnostics(payload);
        setError(null);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error ? caughtError.message : "Failed to load runtime diagnostics."
        );
      }
    }

    void loadDiagnostics();

    const intervalId = window.setInterval(() => {
      void loadDiagnostics();
    }, DIAGNOSTICS_REFRESH_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return {
    diagnostics,
    error,
  };
}
