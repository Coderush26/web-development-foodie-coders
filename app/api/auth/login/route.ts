import { NextResponse } from "next/server";

import { AUTH_SESSION_COOKIE } from "@/config/auth";
import { resolveSafeNextPath } from "@/server/auth/access";
import { writeAuditLog } from "@/server/auth/audit";
import { createSessionForCredentials } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const email = typeof formData?.get("email") === "string" ? String(formData.get("email")) : "";
  const password =
    typeof formData?.get("password") === "string" ? String(formData.get("password")) : "";
  const nextPath =
    typeof formData?.get("next") === "string" ? String(formData.get("next")) : "/command";

  if (!email.trim() || !password) {
    return NextResponse.redirect(new URL("/auth/login?error=missing-fields", request.url), 303);
  }

  try {
    const session = await createSessionForCredentials({
      email,
      password,
      userAgent: request.headers.get("user-agent"),
    });

    if (!session.ok) {
      return NextResponse.redirect(
        new URL(`/auth/login?error=${session.reason}`, request.url),
        303
      );
    }

    const safeNextPath = resolveSafeNextPath(session.identity, nextPath);
    const response = NextResponse.redirect(new URL(safeNextPath, request.url), 303);

    try {
      await writeAuditLog({
        actorUserId: session.identity.userId,
        action: "member.login.succeeded",
        targetType: "session",
        targetId: session.identity.userId,
        metadata: {
          nextPath: safeNextPath,
        },
      });
    } catch (error) {
      console.error("Failed to write login audit log.", error);
    }

    response.cookies.set({
      name: AUTH_SESSION_COOKIE,
      value: session.token,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Phase 1 login failed.", error);
    return NextResponse.redirect(new URL("/auth/login?error=unavailable", request.url), 303);
  }
}
