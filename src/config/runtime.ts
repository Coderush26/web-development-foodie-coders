const aiProvider = process.env.AI_PROVIDER === "openai" ? "openai" : "local";

export const runtimeConfig = {
  aiProvider,
  openAiApiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
  openAiBaseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  weatherProvider: (process.env.WEATHER_PROVIDER ?? "open-meteo") as "open-meteo",
} as const;

export const optionalEnvNames = [
  "AI_PROVIDER",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OPENAI_MODEL",
  "WEATHER_PROVIDER",
] as const;

export const externalServices = [
  {
    name: "Open-Meteo",
    purpose: "Weather overlays, adverse-weather penalties, and route scoring.",
    apiKeyEnv: null,
    requiredInPhase: "Phase 6",
    configured: true,
    notes: "No API key is required for the initial weather implementation.",
  },
  {
    name: "OpenAI-compatible AI provider",
    purpose:
      "Distress-message extraction when you want a real model instead of the local fallback parser.",
    apiKeyEnv: "OPENAI_API_KEY",
    requiredInPhase: "Phase 5 (optional)",
    configured: runtimeConfig.aiProvider === "local" ? false : runtimeConfig.openAiApiKeyConfigured,
    notes:
      runtimeConfig.aiProvider === "local"
        ? "Leave AI_PROVIDER=local to use a deterministic no-key fallback during development."
        : `Configured for ${runtimeConfig.openAiModel} via ${runtimeConfig.openAiBaseUrl}.`,
  },
] as const;
