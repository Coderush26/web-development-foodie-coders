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
import { evaluateGeofenceState } from "@/server/alerts/geofence";
import type { FleetBootstrapPayload, FleetRuntimeSnapshot } from "@/types/realtime";
import type { FleetAlert } from "@/types/alerts";
import type { RestrictedZone, RestrictedZoneDraft } from "@/types/zones";

import { SIMULATION_TICK_MS } from "@/server/simulation/constants";
import { advanceFleetSnapshot, createInitialFleetSnapshot } from "@/server/simulation/engine";

class FleetRuntime {
  private snapshot: FleetRuntimeSnapshot = createInitialFleetSnapshot();
  private intervalHandle: NodeJS.Timeout | null = null;
  private sockets = new Map<WebSocket, string>();
  private membershipByZoneId = new Map<string, Set<string>>();

  start() {
    if (this.intervalHandle) {
      return;
    }

    this.intervalHandle = setInterval(() => {
      const tickStartedAt = Date.now();
      const nextSnapshot = advanceFleetSnapshot(this.snapshot, this.sockets.size, 0);
      const tickDurationMs = Date.now() - tickStartedAt;

      this.commitSnapshot({
        ...nextSnapshot,
        telemetry: {
          ...nextSnapshot.telemetry,
          viewerCount: this.sockets.size,
          lastTickDurationMs: tickDurationMs,
        },
      });

      this.publishSnapshot();
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

  createZone(zoneDraft: RestrictedZoneDraft) {
    const generatedAt = new Date().toISOString();
    const zone: RestrictedZone = {
      id: randomUUID(),
      name: zoneDraft.name.trim() || `Restricted zone ${this.snapshot.zones.length + 1}`,
      points: zoneDraft.points,
      createdAt: generatedAt,
      updatedAt: generatedAt,
    };

    this.commitSnapshot({
      ...this.snapshot,
      generatedAt,
      sequence: this.snapshot.sequence + 1,
      zones: [...this.snapshot.zones, zone],
    });
    this.publishSnapshot();

    return zone;
  }

  updateZone(zoneId: string, zoneDraft: RestrictedZoneDraft) {
    const existingZone = this.snapshot.zones.find((zone) => zone.id === zoneId);

    if (!existingZone) {
      return null;
    }

    const generatedAt = new Date().toISOString();
    const updatedZone: RestrictedZone = {
      ...existingZone,
      name: zoneDraft.name.trim() || existingZone.name,
      points: zoneDraft.points,
      updatedAt: generatedAt,
    };

    this.commitSnapshot({
      ...this.snapshot,
      generatedAt,
      sequence: this.snapshot.sequence + 1,
      zones: this.snapshot.zones.map((zone) => (zone.id === zoneId ? updatedZone : zone)),
    });
    this.publishSnapshot();

    return updatedZone;
  }

  removeZone(zoneId: string) {
    if (!this.snapshot.zones.some((zone) => zone.id === zoneId)) {
      return false;
    }

    const generatedAt = new Date().toISOString();

    this.commitSnapshot({
      ...this.snapshot,
      generatedAt,
      sequence: this.snapshot.sequence + 1,
      zones: this.snapshot.zones.filter((zone) => zone.id !== zoneId),
    });
    this.publishSnapshot();

    return true;
  }

  acknowledgeAlert(alertId: string) {
    return this.updateAlert(alertId, (alert, generatedAt) => {
      if (alert.state === "resolved" || alert.state === "acknowledged") {
        return alert;
      }

      return {
        ...alert,
        state: "acknowledged",
        acknowledgedAt: alert.acknowledgedAt ?? generatedAt,
      };
    });
  }

  resolveAlert(alertId: string) {
    return this.updateAlert(alertId, (alert, generatedAt) => {
      if (alert.state === "resolved") {
        return alert;
      }

      return {
        ...alert,
        state: "resolved",
        acknowledgedAt: alert.acknowledgedAt ?? generatedAt,
        resolvedAt: generatedAt,
      };
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

  private commitSnapshot(nextSnapshot: FleetRuntimeSnapshot) {
    const evaluation = evaluateGeofenceState({
      previousSnapshot: this.snapshot,
      nextSnapshot,
      previousMembershipByZoneId: this.membershipByZoneId,
    });

    this.snapshot = {
      ...evaluation.nextSnapshot,
      telemetry: {
        ...evaluation.nextSnapshot.telemetry,
        viewerCount: this.sockets.size,
      },
    };
    this.membershipByZoneId = evaluation.membershipByZoneId;
  }

  private publishSnapshot() {
    this.broadcast(createFleetSnapshotMessage(this.snapshot));
  }

  private updateAlert(
    alertId: string,
    updater: (alert: FleetAlert, generatedAt: string) => FleetAlert
  ) {
    const existingAlert = this.snapshot.alerts.find((alert) => alert.id === alertId);

    if (!existingAlert) {
      return null;
    }

    const generatedAt = new Date().toISOString();
    const updatedAlerts = this.snapshot.alerts.map((alert) =>
      alert.id === alertId ? updater(alert, generatedAt) : alert
    );

    this.commitSnapshot({
      ...this.snapshot,
      generatedAt,
      sequence: this.snapshot.sequence + 1,
      alerts: updatedAlerts,
    });
    this.publishSnapshot();

    return this.snapshot.alerts.find((alert) => alert.id === alertId) ?? existingAlert;
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
