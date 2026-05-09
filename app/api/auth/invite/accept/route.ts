import { NextResponse } from "next/server";

import { resolveAppBaseUrl } from "@/server/auth/email";
import { acceptInvite } from "@/server/auth/flows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const token = typeof formData?.get("token") === "string" ? String(formData.get("token")) : "";
  const fullName =
    typeof formData?.get("fullName") === "string" ? String(formData.get("fullName")) : "";
  const password =
    typeof formData?.get("password") === "string" ? String(formData.get("password")) : "";
  const confirmPassword =
    typeof formData?.get("confirmPassword") === "string"
      ? String(formData.get("confirmPassword"))
      : "";

  if (!token || !fullName.trim() || !password || !confirmPassword) {
    return NextResponse.redirect(
      new URL(`/auth/invite?token=${encodeURIComponent(token)}&error=missing-fields`, request.url),
      303
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.redirect(
      new URL(
        `/auth/invite?token=${encodeURIComponent(token)}&error=password-mismatch`,
        request.url
      ),
      303
    );
  }

  try {
    const result = await acceptInvite({
      token,
      fullName,
      password,
      appBaseUrl: resolveAppBaseUrl(request.url),
    });

    if (!result) {
      return NextResponse.redirect(
        new URL(`/auth/invite?token=${encodeURIComponent(token)}&error=invalid-token`, request.url),
        303
      );
    }

    const redirectUrl = new URL("/auth/verify-email", request.url);
    redirectUrl.searchParams.set("sent", "1");
    redirectUrl.searchParams.set("email", result.email);
    redirectUrl.searchParams.set("preview", result.verifyUrl);
    return NextResponse.redirect(redirectUrl, 303);
  } catch (error) {
    console.error("Invite acceptance failed.", error);
    return NextResponse.redirect(
      new URL(`/auth/invite?token=${encodeURIComponent(token)}&error=unavailable`, request.url),
      303
    );
  }
}
