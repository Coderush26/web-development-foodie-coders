import { NextResponse } from "next/server";

import { resolveAppBaseUrl } from "@/server/auth/email";
import { requestPasswordReset } from "@/server/auth/flows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const email = typeof formData?.get("email") === "string" ? String(formData.get("email")) : "";

  if (!email.trim()) {
    return NextResponse.redirect(
      new URL("/auth/forgot-password?error=missing-fields", request.url),
      303
    );
  }

  try {
    const previewUrl = await requestPasswordReset({
      email,
      appBaseUrl: resolveAppBaseUrl(request.url),
    });
    const redirectUrl = new URL("/auth/forgot-password", request.url);

    redirectUrl.searchParams.set("sent", "1");

    if (previewUrl) {
      redirectUrl.searchParams.set("preview", previewUrl);
    }

    return NextResponse.redirect(redirectUrl, 303);
  } catch (error) {
    console.error("Password reset request failed.", error);
    return NextResponse.redirect(
      new URL("/auth/forgot-password?error=unavailable", request.url),
      303
    );
  }
}
