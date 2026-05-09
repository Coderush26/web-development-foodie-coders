import { NextResponse } from "next/server";

import {
  AUTH_MODE_COOKIE,
  AUTH_SESSION_COOKIE,
  type AuthMode,
  authModeValues,
  resolveAuthMode,
} from "@/config/auth";
import type { AuthRole } from "@/server/auth/session";
import { getSessionIdentity } from "@/server/auth/session";

export function parseCookieHeader(cookieHeader: string | null | undefined) {
  return Object.fromEntries(
    (cookieHeader ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((entry) => {
        const separatorIndex = entry.indexOf("=");

        if (separatorIndex === -1) {
          return [entry, ""] as const;
        }

        return [
          entry.slice(0, separatorIndex),
          decodeURIComponent(entry.slice(separatorIndex + 1)),
        ] as const;
      })
  );
}

export function resolveAuthModeFromCookieHeader(cookieHeader: string | null | undefined): AuthMode {
  return resolveAuthMode(parseCookieHeader(cookieHeader)[AUTH_MODE_COOKIE]);
}

export type RequestAccessResult = {
  authMode: AuthMode;
  session: Awaited<ReturnType<typeof getSessionIdentity>>;
  response?: NextResponse;
};

export async function resolveRequestAccess(
  request: Request,
  options?: { allowedRoles?: readonly AuthRole[] }
): Promise<RequestAccessResult> {
  const cookieHeader = request.headers.get("cookie");
  const authMode = resolveAuthModeFromCookieHeader(cookieHeader);

  if (authMode !== authModeValues.enabled) {
    return { authMode, session: null };
  }

  const sessionToken = parseCookieHeader(cookieHeader)[AUTH_SESSION_COOKIE];

  if (!sessionToken) {
    return {
      authMode,
      session: null,
      response: NextResponse.json({ message: "Authentication required." }, { status: 401 }),
    };
  }

  const session = await getSessionIdentity(sessionToken);

  if (!session) {
    return {
      authMode,
      session: null,
      response: NextResponse.json(
        { message: "Session expired. Please sign in again." },
        { status: 401 }
      ),
    };
  }

  if (options?.allowedRoles?.length) {
    const allowed = session.roles.some((role) => options.allowedRoles?.includes(role));

    if (!allowed) {
      return {
        authMode,
        session,
        response: NextResponse.json(
          { message: "You do not have access to this route." },
          { status: 403 }
        ),
      };
    }
  }

  return { authMode, session };
}
