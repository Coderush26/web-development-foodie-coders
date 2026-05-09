import type { AuthSessionIdentity } from "@/server/auth/session";

function extractCaptainShipId(pathname: string) {
  return pathname.startsWith("/captain/") ? (pathname.split("/")[2] ?? null) : null;
}

export function hasAnyRole(
  identity: AuthSessionIdentity,
  roles: readonly ("super_admin" | "command" | "captain")[]
) {
  return identity.roles.some((role) => roles.includes(role));
}

export function canAccessCaptainShip(identity: AuthSessionIdentity, shipId: string) {
  if (hasAnyRole(identity, ["super_admin"])) {
    return true;
  }

  return identity.roles.includes("captain") && identity.captainShipIds.includes(shipId);
}

export function canAccessAppPath(identity: AuthSessionIdentity, pathname: string) {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return hasAnyRole(identity, ["super_admin"]);
  }

  if (pathname === "/command" || pathname.startsWith("/command/")) {
    return hasAnyRole(identity, ["super_admin", "command"]);
  }

  const captainShipId = extractCaptainShipId(pathname);

  if (captainShipId) {
    return canAccessCaptainShip(identity, captainShipId);
  }

  if (pathname === "/auth/change-password") {
    return true;
  }

  return true;
}

export function resolveDefaultAppPath(identity: AuthSessionIdentity) {
  if (hasAnyRole(identity, ["super_admin"])) {
    return "/admin";
  }

  if (hasAnyRole(identity, ["command"])) {
    return "/command";
  }

  if (identity.roles.includes("captain") && identity.captainShipIds[0]) {
    return `/captain/${identity.captainShipIds[0]}`;
  }

  return "/";
}

export function resolveSafeNextPath(
  identity: AuthSessionIdentity,
  nextPath: string | null | undefined
) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return resolveDefaultAppPath(identity);
  }

  const url = new URL(nextPath, "http://fleet.local");
  const candidate = `${url.pathname}${url.search}`;

  return canAccessAppPath(identity, url.pathname) ? candidate : resolveDefaultAppPath(identity);
}
