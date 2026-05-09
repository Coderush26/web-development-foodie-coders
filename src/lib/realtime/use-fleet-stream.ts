"use client";

import { useEffect, useRef, useState } from "react";

import {
  FLEET_BOOTSTRAP_PATH,
  FLEET_PROTOCOL_VERSION,
  parseFleetServerMessage,
} from "@/lib/realtime/messages";
import type { FleetRuntimeSnapshot } from "@/types/realtime";

type FleetConnectionState = "loading" | "connecting" | "open" | "closed" | "error";

function buildBootstrapUrl(shipId?: string) {
  const url = new URL(FLEET_BOOTSTRAP_PATH, window.location.origin);

  if (shipId) {
    url.searchParams.set("shipId", shipId);
  }

  return url.toString();
}

function buildSocketUrl(socketPath: string, shipId?: string) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const url = new URL(`${protocol}//${window.location.host}${socketPath}`);

  if (shipId) {
    url.searchParams.set("shipId", shipId);
  }

  return url.toString();
}

export function useFleetStream(shipId?: string) {
  const [snapshot, setSnapshot] = useState<FleetRuntimeSnapshot | null>(null);
  const [connectionState, setConnectionState] = useState<FleetConnectionState>("loading");
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const lastSequenceRef = useRef(0);
  const socketPathRef = useRef("");

  useEffect(() => {
    let active = true;

    function clearRetry() {
      if (retryTimeoutRef.current !== null) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    }

    function connect(socketPath: string) {
      socketPathRef.current = socketPath;
      setConnectionState("connecting");

      const socket = new WebSocket(buildSocketUrl(socketPath, shipId));
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        if (!active) {
          return;
        }

        setConnectionState("open");
        setError(null);

        socket.send(
          JSON.stringify({
            type: "client.ready",
            protocolVersion: FLEET_PROTOCOL_VERSION,
            lastKnownSequence: lastSequenceRef.current,
          })
        );
      });

      socket.addEventListener("message", (event) => {
        if (!active || typeof event.data !== "string") {
          return;
        }

        const message = parseFleetServerMessage(event.data);

        if (!message) {
          return;
        }

        if (message.type === "fleet.snapshot") {
          lastSequenceRef.current = message.payload.sequence;
          setSnapshot(message.payload);
        }

        if (message.type === "fleet.error") {
          setError(message.payload.message);
        }
      });

      socket.addEventListener("close", () => {
        if (!active) {
          return;
        }

        setConnectionState("closed");
        clearRetry();
        retryTimeoutRef.current = window.setTimeout(() => {
          if (active && socketPathRef.current) {
            connect(socketPathRef.current);
          }
        }, 1200);
      });

      socket.addEventListener("error", () => {
        if (!active) {
          return;
        }

        setConnectionState("error");
        setError("Live fleet socket disconnected unexpectedly.");
      });
    }

    async function bootstrap() {
      try {
        const response = await fetch(buildBootstrapUrl(shipId), { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Bootstrap request failed with ${response.status}`);
        }

        const payload = (await response.json()) as {
          snapshot: FleetRuntimeSnapshot;
          socketPath: string | null;
          realtimeTransport: "websocket" | "snapshot";
          transportMessage?: string | null;
        };

        if (!active) {
          return;
        }

        lastSequenceRef.current = payload.snapshot.sequence;
        setSnapshot(payload.snapshot);

        if (payload.realtimeTransport === "websocket" && payload.socketPath) {
          connect(payload.socketPath);
          return;
        }

        setConnectionState("error");
        setError(
          payload.transportMessage ??
            "Live transport is unavailable on this host. Snapshot mode remains available."
        );
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setConnectionState("error");
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to load fleet bootstrap state."
        );
      }
    }

    void bootstrap();

    return () => {
      active = false;
      clearRetry();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [shipId]);

  const ship =
    shipId && snapshot ? (snapshot.ships.find((item) => item.shipId === shipId) ?? null) : null;

  return {
    snapshot,
    ship,
    connectionState,
    error,
  };
}
