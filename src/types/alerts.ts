export type AlertSeverity = "info" | "warning" | "critical";

export type AlertSource = "geofence" | "proximity" | "weather" | "distress" | "system";

export type AlertState = "active" | "acknowledged" | "resolved";

export interface FleetAlert {
  id: string;
  source: AlertSource;
  severity: AlertSeverity;
  state: AlertState;
  title: string;
  message: string;
  affectedShipIds: string[];
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
