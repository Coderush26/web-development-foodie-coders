import { randomUUID } from "node:crypto";

import type { WebSocket } from "ws";

import {
  FLEET_PROTOCOL_VERSION,
  FLEET_SOCKET_PATH,
  createFleetConnectionMessage,
  createFleetErrorMessage,
  createFleetSnapshotMessage,
  parseFleetClientMessage,
} from "@/lib/realtime/messages";
import type { FleetBootstrapPayload, FleetRuntimeSnapshot } from "@/types/realtime";

import { SIMULATION_TICK_MS } from "@/server/simulation/constants";
import { advanceFleetSnapshot, createInitialFleetSnapshot } from "@/server/simulation/engine";

class FleetRuntime {
  private snapshot: FleetRuntimeSnapshot = createInitialFleetSnapshot();
  private intervalHandle: NodeJS.Timeout | null = null;
  private sockets = new Map<WebSocket, string>();

  start() {
    if (this.intervalHandle) {
      return;
    }

    this.intervalHandle = setInterval(() => {
      const tickStartedAt = Date.now();
      const nextSnapshot = advanceFleetSnapshot(this.snapshot, this.sockets.size, 0);
      const tickDurationMs = Date.now() - tickStartedAt;

      this.snapshot = {
        ...nextSnapshot,
        telemetry: {
          ...nextSnapshot.telemetry,
          viewerCount: this.sockets.size,
          lastTickDurationMs: tickDurationMs,
        },
      };

      this.broadcast(createFleetSnapshotMessage(this.snapshot));
    }, SIMULATION_TICK_MS);
  }

  getSnapshot() {
    return this.snapshot;
  }

  getBootstrapPayload(): FleetBootstrapPayload {
    return {
      snapshot: this.snapshot,
      socketPath: FLEET_SOCKET_PATH,
      protocolVersion: FLEET_PROTOCOL_VERSION,
    };
  }

  attachClient(socket: WebSocket) {
    const connectionId = randomUUID();
    this.sockets.set(socket, connectionId);
    this.syncViewerCount();

    this.send(
      socket,
      createFleetConnectionMessage(
        connectionId,
        new Date().toISOString(),
        this.sockets.size,
        this.snapshot.sequence
      )
    );
    this.send(socket, createFleetSnapshotMessage(this.snapshot));

    socket.on("message", (value) => {
      const message = parseFleetClientMessage(value.toString());

      if (!message) {
        this.send(socket, createFleetErrorMessage("Unsupported client message."));
        return;
      }

      if (
        message.lastKnownSequence === undefined ||
        message.lastKnownSequence < this.snapshot.sequence
      ) {
        this.send(socket, createFleetSnapshotMessage(this.snapshot));
      }
    });

    socket.on("close", () => {
      this.sockets.delete(socket);
      this.syncViewerCount();
    });

    socket.on("error", () => {
      this.sockets.delete(socket);
      this.syncViewerCount();
    });
  }

  private syncViewerCount() {
    this.snapshot = {
      ...this.snapshot,
      telemetry: {
        ...this.snapshot.telemetry,
        viewerCount: this.sockets.size,
      },
    };
  }

  private broadcast(message: ReturnType<typeof createFleetSnapshotMessage>) {
    for (const socket of this.sockets.keys()) {
      this.send(socket, message);
    }
  }

  private send(socket: WebSocket, message: object) {
    if (socket.readyState !== socket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(message));
  }
}

declare global {
  var __fleetRuntimeSingleton: FleetRuntime | undefined;
}

export function getFleetRuntime() {
  globalThis.__fleetRuntimeSingleton ??= new FleetRuntime();
  return globalThis.__fleetRuntimeSingleton;
}
