import type { FleetRuntimeSnapshot } from "@/types/realtime";

export const FLEET_PROTOCOL_VERSION = 1;
export const FLEET_BOOTSTRAP_PATH = "/api/fleet";
export const FLEET_SOCKET_PATH = "/api/fleet/ws";

export interface FleetConnectionMessage {
  type: "fleet.connection";
  protocolVersion: number;
  payload: {
    connectionId: string;
    connectedAt: string;
    viewerCount: number;
    lastSequence: number;
  };
}

export interface FleetSnapshotMessage {
  type: "fleet.snapshot";
  protocolVersion: number;
  payload: FleetRuntimeSnapshot;
}

export interface FleetErrorMessage {
  type: "fleet.error";
  protocolVersion: number;
  payload: {
    message: string;
  };
}

export interface FleetReadyMessage {
  type: "client.ready";
  protocolVersion: number;
  lastKnownSequence?: number;
}

export type FleetServerMessage = FleetConnectionMessage | FleetSnapshotMessage | FleetErrorMessage;
export type FleetClientMessage = FleetReadyMessage;

export function createFleetConnectionMessage(
  connectionId: string,
  connectedAt: string,
  viewerCount: number,
  lastSequence: number
): FleetConnectionMessage {
  return {
    type: "fleet.connection",
    protocolVersion: FLEET_PROTOCOL_VERSION,
    payload: {
      connectionId,
      connectedAt,
      viewerCount,
      lastSequence,
    },
  };
}

export function createFleetSnapshotMessage(snapshot: FleetRuntimeSnapshot): FleetSnapshotMessage {
  return {
    type: "fleet.snapshot",
    protocolVersion: FLEET_PROTOCOL_VERSION,
    payload: snapshot,
  };
}

export function createFleetErrorMessage(message: string): FleetErrorMessage {
  return {
    type: "fleet.error",
    protocolVersion: FLEET_PROTOCOL_VERSION,
    payload: { message },
  };
}

export function parseFleetClientMessage(input: string): FleetClientMessage | null {
  try {
    const value = JSON.parse(input) as Partial<FleetReadyMessage>;

    if (value.type !== "client.ready" || value.protocolVersion !== FLEET_PROTOCOL_VERSION) {
      return null;
    }

    return {
      type: value.type,
      protocolVersion: value.protocolVersion,
      lastKnownSequence:
        typeof value.lastKnownSequence === "number"
          ? Math.max(0, Math.floor(value.lastKnownSequence))
          : undefined,
    };
  } catch {
    return null;
  }
}

export function parseFleetServerMessage(input: string): FleetServerMessage | null {
  try {
    const value = JSON.parse(input) as Partial<FleetServerMessage>;

    if (value.protocolVersion !== FLEET_PROTOCOL_VERSION || typeof value.type !== "string") {
      return null;
    }

    if (value.type === "fleet.snapshot" && value.payload) {
      return value as FleetSnapshotMessage;
    }

    if (value.type === "fleet.connection" && value.payload) {
      return value as FleetConnectionMessage;
    }

    if (value.type === "fleet.error" && value.payload) {
      return value as FleetErrorMessage;
    }

    return null;
  } catch {
    return null;
  }
}

export function isFleetSocketPath(rawUrl?: string) {
  if (!rawUrl) {
    return false;
  }

  const path = new URL(rawUrl, "http://localhost").pathname;
  return path === FLEET_SOCKET_PATH;
}
