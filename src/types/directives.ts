import type { DistressAssessment } from "@/types/distress";
import type { GeoPoint } from "@/types/fleet";

export type DirectiveType = "reroute-port" | "divert-waypoint" | "hold-position";

export type DirectiveStatus = "pending" | "accepted" | "escalated";

export type CaptainResponseType = "accept" | "escalate-distress";

export interface FleetDirective {
  id: string;
  shipId: string;
  type: DirectiveType;
  issuedAt: string;
  issuedBy: "command";
  status: DirectiveStatus;
  targetPortId?: string;
  waypoint?: GeoPoint;
  note?: string;
  captainResponseId?: string;
  appliedAt?: string;
}

export interface CaptainResponse {
  id: string;
  directiveId: string;
  shipId: string;
  response: CaptainResponseType;
  respondedAt: string;
  distressMessage?: string;
  distressAssessment?: DistressAssessment;
}
