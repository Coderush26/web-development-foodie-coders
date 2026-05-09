export function getAuthEmailProvider() {
  return (process.env.EMAIL_PROVIDER ?? "console").trim().toLowerCase();
}

export function resolveAppBaseUrl(requestUrl?: string) {
  const configured = process.env.APP_BASE_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (requestUrl) {
    return new URL(requestUrl).origin;
  }

  return "http://localhost:3000";
}

export async function sendAuthActionEmail(input: {
  to: string;
  subject: string;
  actionLabel: string;
  actionUrl: string;
  summary: string;
}) {
  const provider = getAuthEmailProvider();
  const previewUrl = input.actionUrl;

  console.info(
    [
      `Auth email provider: ${provider}`,
      `To: ${input.to}`,
      `Subject: ${input.subject}`,
      `Summary: ${input.summary}`,
      `${input.actionLabel}: ${input.actionUrl}`,
    ].join("\n")
  );

  return {
    provider,
    previewUrl,
  };
}
