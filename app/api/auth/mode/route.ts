import { NextResponse } from "next/server";

import { AUTH_MODE_COOKIE, authModeValues, resolveAuthMode } from "@/config/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseMode(value: FormDataEntryValue | unknown) {
  return resolveAuthMode(typeof value === "string" ? value : undefined);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  const mode = contentType.includes("application/json")
    ? parseMode(((await request.json().catch(() => null)) as { mode?: unknown } | null)?.mode)
    : parseMode((await request.formData().catch(() => new FormData())).get("mode"));

  const response = NextResponse.json({ mode });

  response.cookies.set({
    name: AUTH_MODE_COOKIE,
    value: mode,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ mode: authModeValues.disabled });
  response.cookies.set({
    name: AUTH_MODE_COOKIE,
    value: authModeValues.disabled,
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
