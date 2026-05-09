import { NextResponse } from "next/server";

import { AUTH_SESSION_COOKIE } from "@/config/auth";
import { revokeSession } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const sessionToken = request.headers
    .get("cookie")
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${AUTH_SESSION_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");

  await revokeSession(sessionToken ? decodeURIComponent(sessionToken) : null);

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
