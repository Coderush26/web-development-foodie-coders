import type { AlertSeverity } from "@/types/alerts";
import type { ShipSnapshot } from "@/types/fleet";

export type PlaybackEventKind = "alert" | "directive" | "response" | "status-change";

export interface PlaybackEvent {
  id: string;
  kind: PlaybackEventKind;
  occurredAt: string;
  shipIds: string[];
  summary: string;
  severity?: AlertSeverity;
}

export interface PlaybackFrame {
  capturedAt: string;
  ships: ShipSnapshot[];
  events: PlaybackEvent[];
}
