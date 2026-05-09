import { NextResponse } from "next/server";

import { authModeValues } from "@/config/auth";
import { resolveAppBaseUrl } from "@/server/auth/email";
import { createInvitedMember } from "@/server/auth/members";
import { resolveRequestAccess } from "@/server/auth/request";
import type { AuthRole } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveRedirectUrl(request: Request, params?: Record<string, string>) {
  const url = new URL("/admin", request.url);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return url;
}

function parseRole(value: FormDataEntryValue | null): AuthRole | null {
  return value === "super_admin" || value === "command" || value === "captain" ? value : null;
}

export async function POST(request: Request) {
  const access = await resolveRequestAccess(request, { allowedRoles: ["super_admin"] });

  if (access.authMode !== authModeValues.enabled) {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }

  if (access.response || !access.session) {
    return NextResponse.redirect(new URL("/auth/login?next=/admin", request.url), 303);
  }

  const formData = await request.formData().catch(() => null);
  const fullName =
    typeof formData?.get("fullName") === "string" ? String(formData.get("fullName")) : "";
  const email = typeof formData?.get("email") === "string" ? String(formData.get("email")) : "";
  const role = parseRole(formData?.get("role") ?? null);
  const captainShipId =
    typeof formData?.get("captainShipId") === "string" ? String(formData.get("captainShipId")) : "";

  if (!fullName.trim() || !email.trim() || !role) {
    return NextResponse.redirect(resolveRedirectUrl(request, { error: "missing-fields" }), 303);
  }

  try {
    const result = await createInvitedMember({
      actorUserId: access.session.userId,
      fullName,
      email,
      role,
      captainShipId: captainShipId || null,
      appBaseUrl: resolveAppBaseUrl(request.url),
    });

    return NextResponse.redirect(
      resolveRedirectUrl(request, { status: "member-created", invite: result.inviteUrl }),
      303
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create member.";
    return NextResponse.redirect(resolveRedirectUrl(request, { error: message }), 303);
  }
}
