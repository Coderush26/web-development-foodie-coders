import { NextResponse } from "next/server";

import { resetPassword } from "@/server/auth/flows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const token = typeof formData?.get("token") === "string" ? String(formData.get("token")) : "";
  const password =
    typeof formData?.get("password") === "string" ? String(formData.get("password")) : "";
  const confirmPassword =
    typeof formData?.get("confirmPassword") === "string"
      ? String(formData.get("confirmPassword"))
      : "";

  if (!token || !password || !confirmPassword) {
    return NextResponse.redirect(
      new URL(
        `/auth/reset-password?token=${encodeURIComponent(token)}&error=missing-fields`,
        request.url
      ),
      303
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.redirect(
      new URL(
        `/auth/reset-password?token=${encodeURIComponent(token)}&error=password-mismatch`,
        request.url
      ),
      303
    );
  }

  try {
    const result = await resetPassword(token, password);

    if (!result) {
      return NextResponse.redirect(
        new URL(
          `/auth/reset-password?token=${encodeURIComponent(token)}&error=invalid-token`,
          request.url
        ),
        303
      );
    }

    return NextResponse.redirect(new URL("/auth/login?reset=1", request.url), 303);
  } catch (error) {
    console.error("Password reset completion failed.", error);
    return NextResponse.redirect(
      new URL(
        `/auth/reset-password?token=${encodeURIComponent(token)}&error=unavailable`,
        request.url
      ),
      303
    );
  }
}
