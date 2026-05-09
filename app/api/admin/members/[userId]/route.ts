import { NextResponse } from "next/server";

import { authModeValues } from "@/config/auth";
import { resolveAppBaseUrl } from "@/server/auth/email";
import { resendMemberInvite } from "@/server/auth/member-invites";
import { resolveRequestAccess } from "@/server/auth/request";
import type { AuthRole } from "@/server/auth/session";
import { toggleMemberStatus, updateMemberAccess } from "@/server/auth/members";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{
    userId: string;
  }>;
};

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

export async function POST(request: Request, { params }: RouteProps) {
  const access = await resolveRequestAccess(request, { allowedRoles: ["super_admin"] });

  if (access.authMode !== authModeValues.enabled) {
    return NextResponse.redirect(new URL("/", request.url), 303);
  }

  if (access.response || !access.session) {
    return NextResponse.redirect(new URL("/auth/login?next=/admin", request.url), 303);
  }

  const { userId } = await params;
  const formData = await request.formData().catch(() => null);
  const intent = typeof formData?.get("intent") === "string" ? String(formData.get("intent")) : "";

  try {
    if (intent === "toggle-status") {
      await toggleMemberStatus({ actorUserId: access.session.userId, userId });
      return NextResponse.redirect(resolveRedirectUrl(request, { status: "member-updated" }), 303);
    }

    if (intent === "resend-invite") {
      const inviteUrl = await resendMemberInvite({
        actorUserId: access.session.userId,
        userId,
        appBaseUrl: resolveAppBaseUrl(request.url),
      });
      return NextResponse.redirect(
        resolveRedirectUrl(request, { status: "invite-resent", invite: inviteUrl }),
        303
      );
    }

    if (intent === "update-access") {
      const role = parseRole(formData?.get("role") ?? null);
      const captainShipId =
        typeof formData?.get("captainShipId") === "string"
          ? String(formData.get("captainShipId"))
          : "";

      if (!role) {
        return NextResponse.redirect(resolveRedirectUrl(request, { error: "Invalid role." }), 303);
      }

      await updateMemberAccess({
        actorUserId: access.session.userId,
        userId,
        role,
        captainShipId: captainShipId || null,
      });
      return NextResponse.redirect(resolveRedirectUrl(request, { status: "member-updated" }), 303);
    }

    return NextResponse.redirect(
      resolveRedirectUrl(request, { error: "Unknown member action." }),
      303
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Member update failed.";
    return NextResponse.redirect(resolveRedirectUrl(request, { error: message }), 303);
  }
}
