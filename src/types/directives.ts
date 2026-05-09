import type { GeoPoint } from "@/types/fleet";

export type DirectiveType = "reroute-port" | "divert-waypoint" | "hold-position";

export type CaptainResponseType = "pending" | "accept" | "escalate-distress";

export interface FleetDirective {
  id: string;
  shipId: string;
  type: DirectiveType;
  issuedAt: string;
  issuedBy: "command";
  targetPortId?: string;
  waypoint?: GeoPoint;
  note?: string;
}

export interface CaptainResponse {
  directiveId: string;
  shipId: string;
  response: CaptainResponseType;
  respondedAt: string;
  distressMessage?: string;
}
