import type { AlertSeverity } from "@/types/alerts";

export type DistressIssueType =
  | "injury"
  | "engine-failure"
  | "fire"
  | "collision"
  | "flooding"
  | "cargo-damage"
  | "navigation"
  | "fuel-system"
  | "unknown";

export interface DistressAssessment {
  severity: AlertSeverity;
  issueType: DistressIssueType;
  quantifiedImpact: string | null;
  summary: string;
  provider: "local" | "openai";
  rawMessage: string;
}
