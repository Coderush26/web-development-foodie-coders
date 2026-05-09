import { NextResponse } from "next/server";

import { AUTH_SESSION_COOKIE, authModeValues } from "@/config/auth";
import { changePassword } from "@/server/auth/flows";
import { getSessionIdentity } from "@/server/auth/session";
import { parseCookieHeader, resolveAuthModeFromCookieHeader } from "@/server/auth/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const authMode = resolveAuthModeFromCookieHeader(cookieHeader);
  const sessionToken = parseCookieHeader(cookieHeader)[AUTH_SESSION_COOKIE];
  const session = await getSessionIdentity(sessionToken);
  const formData = await request.formData().catch(() => null);
  const currentPassword =
    typeof formData?.get("currentPassword") === "string"
      ? String(formData.get("currentPassword"))
      : "";
  const nextPassword =
    typeof formData?.get("nextPassword") === "string" ? String(formData.get("nextPassword")) : "";
  const confirmPassword =
    typeof formData?.get("confirmPassword") === "string"
      ? String(formData.get("confirmPassword"))
      : "";

  if (authMode !== authModeValues.enabled || !session) {
    return NextResponse.redirect(
      new URL("/auth/login?next=/auth/change-password", request.url),
      303
    );
  }

  if (!currentPassword || !nextPassword || !confirmPassword) {
    return NextResponse.redirect(
      new URL("/auth/change-password?error=missing-fields", request.url),
      303
    );
  }

  if (nextPassword !== confirmPassword) {
    return NextResponse.redirect(
      new URL("/auth/change-password?error=password-mismatch", request.url),
      303
    );
  }

  try {
    const changed = await changePassword({
      userId: session.userId,
      currentPassword,
      nextPassword,
    });

    if (!changed) {
      return NextResponse.redirect(
        new URL("/auth/change-password?error=invalid-current", request.url),
        303
      );
    }

    return NextResponse.redirect(new URL("/auth/change-password?changed=1", request.url), 303);
  } catch (error) {
    console.error("Password change failed.", error);
    return NextResponse.redirect(
      new URL("/auth/change-password?error=unavailable", request.url),
      303
    );
  }
}
