import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  AUTH_MODE_COOKIE,
  AUTH_SESSION_COOKIE,
  authModeValues,
  isProtectedAppPath,
} from "@/config/auth";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedAppPath(pathname)) {
    return NextResponse.next();
  }

  const authMode = request.cookies.get(AUTH_MODE_COOKIE)?.value;

  if (authMode !== authModeValues.enabled) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(AUTH_SESSION_COOKIE)?.value;

  if (sessionToken) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/command/:path*", "/captain/:path*"],
};
