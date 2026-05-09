import test from "node:test";
import assert from "node:assert/strict";

import {
  canAccessAppPath,
  canAccessCaptainShip,
  resolveDefaultAppPath,
  resolveSafeNextPath,
} from "@/server/auth/access";
import type { AuthSessionIdentity } from "@/server/auth/session";

const superAdmin: AuthSessionIdentity = {
  userId: "usr_admin",
  email: "admin@fleet.local",
  fullName: "Admin",
  roles: ["super_admin"],
  captainShipIds: [],
};

const commandUser: AuthSessionIdentity = {
  userId: "usr_command",
  email: "command@fleet.local",
  fullName: "Command",
  roles: ["command"],
  captainShipIds: [],
};

const captainUser: AuthSessionIdentity = {
  userId: "usr_captain",
  email: "captain@fleet.local",
  fullName: "Captain",
  roles: ["captain"],
  captainShipIds: ["MV-7"],
};

test("role-aware paths resolve to the correct default route", () => {
  assert.equal(resolveDefaultAppPath(superAdmin), "/admin");
  assert.equal(resolveDefaultAppPath(commandUser), "/command");
  assert.equal(resolveDefaultAppPath(captainUser), "/captain/MV-7");
});

test("captains stay locked to their assigned ship route", () => {
  assert.equal(canAccessCaptainShip(captainUser, "MV-7"), true);
  assert.equal(canAccessCaptainShip(captainUser, "MV-8"), false);
  assert.equal(canAccessAppPath(captainUser, "/captain/MV-7"), true);
  assert.equal(canAccessAppPath(captainUser, "/captain/MV-8"), false);
  assert.equal(canAccessAppPath(captainUser, "/command"), false);
  assert.equal(canAccessAppPath(captainUser, "/admin"), false);
});

test("safe next-path resolution drops unauthorized destinations", () => {
  assert.equal(resolveSafeNextPath(commandUser, "/command"), "/command");
  assert.equal(resolveSafeNextPath(commandUser, "/captain/MV-1"), "/command");
  assert.equal(
    resolveSafeNextPath(captainUser, "/captain/MV-7?tab=alerts"),
    "/captain/MV-7?tab=alerts"
  );
  assert.equal(resolveSafeNextPath(captainUser, "/admin"), "/captain/MV-7");
});
