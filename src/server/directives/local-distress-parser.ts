import type { DistressAssessment, DistressIssueType } from "@/types/distress";

const issueMatchers: Array<{ issueType: DistressIssueType; pattern: RegExp }> = [
  { issueType: "fire", pattern: /fire|smoke|burn/i },
  { issueType: "flooding", pattern: /flood|taking on water|water ingress|leak/i },
  { issueType: "collision", pattern: /collision|allision|hit|struck/i },
  {
    issueType: "engine-failure",
    pattern: /engine fail|engine room|propulsion|main engine|blackout/i,
  },
  { issueType: "injury", pattern: /injur|casualt|medical|crew down|burn victim/i },
  { issueType: "cargo-damage", pattern: /cargo|container|spill|damage to cargo/i },
  { issueType: "fuel-system", pattern: /fuel|bunker|pump failure|fuel leak/i },
  { issueType: "navigation", pattern: /steering|rudder|navigation|drift|off course/i },
];

const criticalSeverityPattern =
  /mayday|fire|flood|taking on water|collision|abandon ship|engine fail|blackout|injur|medical emergency|dead|critical/i;

const warningSeverityPattern =
  /damage|smoke|loss of power|reduced speed|drifting|steering issue|fuel leak|cargo shift|warning/i;

const quantifiedImpactPattern =
  /(\d+(?:\.\d+)?)\s*(crew|people|injur(?:y|ies)|containers?|engines?|hours?|minutes?|km|nm|nautical miles|tons?|compartments?|pumps?)/i;

const issueLabels: Record<DistressIssueType, string> = {
  injury: "crew injury",
  "engine-failure": "engine failure",
  fire: "fire onboard",
  collision: "collision risk",
  flooding: "flooding",
  "cargo-damage": "cargo damage",
  navigation: "navigation issue",
  "fuel-system": "fuel system issue",
  unknown: "distress issue",
};

function resolveIssueType(message: string): DistressIssueType {
  const match = issueMatchers.find(({ pattern }) => pattern.test(message));
  return match?.issueType ?? "unknown";
}

function resolveSeverity(message: string): DistressAssessment["severity"] {
  if (criticalSeverityPattern.test(message)) {
    return "critical";
  }

  if (warningSeverityPattern.test(message)) {
    return "warning";
  }

  return "info";
}

function resolveQuantifiedImpact(message: string) {
  return message.match(quantifiedImpactPattern)?.[0] ?? null;
}

export function parseDistressMessageLocally(message: string): DistressAssessment {
  const normalizedMessage = message.trim().replace(/\s+/g, " ");
  const issueType = resolveIssueType(normalizedMessage);
  const severity = resolveSeverity(normalizedMessage);
  const quantifiedImpact = resolveQuantifiedImpact(normalizedMessage);
  const summaryParts = [
    issueLabels[issueType],
    quantifiedImpact ? `impact ${quantifiedImpact}` : null,
  ].filter(Boolean);

  return {
    severity,
    issueType,
    quantifiedImpact,
    summary: summaryParts.join(" with "),
    provider: "local",
    rawMessage: normalizedMessage,
  };
}
