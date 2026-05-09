import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  AUTH_MODE_COOKIE,
  AUTH_SESSION_COOKIE,
  authModeValues,
  resolveAuthMode,
} from "@/config/auth";
import { resolveDefaultAppPath, resolveSafeNextPath } from "@/server/auth/access";
import { getSessionIdentity, type AuthSessionIdentity } from "@/server/auth/session";

export async function getCurrentAuthContext() {
  const cookieStore = await cookies();
  const authMode = resolveAuthMode(cookieStore.get(AUTH_MODE_COOKIE)?.value);
  const sessionToken = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  const session = await getSessionIdentity(sessionToken);

  return {
    authMode,
    session,
  };
}

export async function requirePageAccess(pathname: string) {
  const context = await getCurrentAuthContext();

  if (context.authMode !== authModeValues.enabled) {
    return context;
  }

  if (!context.session) {
    redirect(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }

  const safePath = resolveSafeNextPath(context.session, pathname);

  if (safePath !== pathname) {
    redirect(safePath);
  }

  return context;
}

export async function requireProtectedPageAccess(pathname: string) {
  const context = await getCurrentAuthContext();

  if (context.authMode !== authModeValues.enabled) {
    redirect("/");
  }

  if (!context.session) {
    redirect(`/auth/login?next=${encodeURIComponent(pathname)}`);
  }

  const safePath = resolveSafeNextPath(context.session, pathname);

  if (safePath !== pathname) {
    redirect(safePath);
  }

  return {
    authMode: authModeValues.enabled,
    session: context.session as AuthSessionIdentity,
  };
}

export async function redirectSignedInUser(nextPath?: string | null) {
  const context = await getCurrentAuthContext();

  if (context.authMode === authModeValues.enabled && context.session) {
    redirect(
      resolveSafeNextPath(context.session, nextPath ?? resolveDefaultAppPath(context.session))
    );
  }

  return context;
}
