import { NextResponse } from "next/server";

import { AUTH_SESSION_COOKIE } from "@/config/auth";
import { writeAuditLog } from "@/server/auth/audit";
import { getSessionIdentity, revokeSession } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseSessionToken(cookieHeader: string | null) {
  return cookieHeader
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${AUTH_SESSION_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

export async function POST(request: Request) {
  const sessionToken = parseSessionToken(request.headers.get("cookie"));
  const decodedSessionToken = sessionToken ? decodeURIComponent(sessionToken) : null;
  const sessionIdentity = await getSessionIdentity(decodedSessionToken);

  await revokeSession(decodedSessionToken);

  if (sessionIdentity) {
    try {
      await writeAuditLog({
        actorUserId: sessionIdentity.userId,
        action: "member.logout.succeeded",
        targetType: "session",
        targetId: sessionIdentity.userId,
      });
    } catch (error) {
      console.error("Failed to write logout audit log.", error);
    }
  }

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set({
    name: AUTH_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  return response;
}
