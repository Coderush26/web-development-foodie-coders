export const AUTH_MODE_COOKIE = "fleet-auth-mode";
export const AUTH_SESSION_COOKIE = "fleet-auth-session";

export const authModeValues = {
  enabled: "enabled",
  disabled: "disabled",
} as const;

export type AuthMode = (typeof authModeValues)[keyof typeof authModeValues];

export function resolveAuthMode(value: string | undefined): AuthMode {
  return value === authModeValues.enabled ? authModeValues.enabled : authModeValues.disabled;
}

export function isProtectedAppPath(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/command" ||
    pathname.startsWith("/captain/")
  );
}
