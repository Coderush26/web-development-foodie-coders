function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

export async function withLocalAiProvider<T>(run: () => Promise<T> | T) {
  const previousValues = {
    aiProvider: process.env.AI_PROVIDER,
    openAiApiKey: process.env.OPENAI_API_KEY,
    openAiBaseUrl: process.env.OPENAI_BASE_URL,
    openAiModel: process.env.OPENAI_MODEL,
  };

  process.env.AI_PROVIDER = "local";
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_BASE_URL;
  delete process.env.OPENAI_MODEL;

  try {
    return await run();
  } finally {
    restoreEnv("AI_PROVIDER", previousValues.aiProvider);
    restoreEnv("OPENAI_API_KEY", previousValues.openAiApiKey);
    restoreEnv("OPENAI_BASE_URL", previousValues.openAiBaseUrl);
    restoreEnv("OPENAI_MODEL", previousValues.openAiModel);
  }
}
