import { runtimeConfig } from "@/config/runtime";
import { parseDistressMessageLocally } from "@/server/directives/local-distress-parser";
import type { DistressAssessment, DistressIssueType } from "@/types/distress";

type OpenAiDistressPayload = {
  severity?: DistressAssessment["severity"];
  issueType?: DistressIssueType;
  quantifiedImpact?: string | null;
  summary?: string;
};

const allowedSeverities = new Set<DistressAssessment["severity"]>(["info", "warning", "critical"]);
const allowedIssueTypes = new Set<DistressIssueType>([
  "injury",
  "engine-failure",
  "fire",
  "collision",
  "flooding",
  "cargo-damage",
  "navigation",
  "fuel-system",
  "unknown",
]);

function extractJsonObject(input: string) {
  const startIndex = input.indexOf("{");
  const endIndex = input.lastIndexOf("}");

  if (startIndex < 0 || endIndex <= startIndex) {
    return null;
  }

  return input.slice(startIndex, endIndex + 1);
}

function normalizeOpenAiPayload(
  message: string,
  payload: OpenAiDistressPayload
): DistressAssessment {
  return {
    severity: allowedSeverities.has(payload.severity ?? "info")
      ? (payload.severity ?? "info")
      : "info",
    issueType: allowedIssueTypes.has(payload.issueType ?? "unknown")
      ? (payload.issueType ?? "unknown")
      : "unknown",
    quantifiedImpact:
      typeof payload.quantifiedImpact === "string" && payload.quantifiedImpact.trim().length > 0
        ? payload.quantifiedImpact.trim()
        : null,
    summary:
      typeof payload.summary === "string" && payload.summary.trim().length > 0
        ? payload.summary.trim()
        : parseDistressMessageLocally(message).summary,
    provider: "openai",
    rawMessage: message,
  };
}

async function extractWithOpenAi(message: string) {
  const response = await fetch(`${runtimeConfig.openAiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: runtimeConfig.openAiModel,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "Extract distress reports into JSON with keys severity, issueType, quantifiedImpact, and summary. Severity must be info, warning, or critical. issueType must be injury, engine-failure, fire, collision, flooding, cargo-damage, navigation, fuel-system, or unknown.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI extraction failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  const jsonObject = typeof content === "string" ? extractJsonObject(content) : null;

  if (!jsonObject) {
    throw new Error("OpenAI extraction returned no JSON object.");
  }

  return normalizeOpenAiPayload(message, JSON.parse(jsonObject) as OpenAiDistressPayload);
}

export async function extractDistressAssessment(message: string) {
  const normalizedMessage = message.trim().replace(/\s+/g, " ");

  if (
    runtimeConfig.aiProvider === "openai" &&
    runtimeConfig.openAiApiKeyConfigured &&
    process.env.OPENAI_API_KEY
  ) {
    try {
      return await extractWithOpenAi(normalizedMessage);
    } catch {
      return parseDistressMessageLocally(normalizedMessage);
    }
  }

  return parseDistressMessageLocally(normalizedMessage);
}
