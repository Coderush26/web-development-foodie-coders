import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";

import { proxy } from "@/proxy";
import { AUTH_MODE_COOKIE, AUTH_SESSION_COOKIE, authModeValues } from "@/config/auth";

function createRequest(pathname: string, cookies: string[] = []) {
  return new NextRequest(`http://localhost:3000${pathname}`, {
    headers: cookies.length > 0 ? { cookie: cookies.join("; ") } : undefined,
  });
}

test("proxy allows public routes to continue", () => {
  const response = proxy(createRequest("/overview"));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
});

test("proxy redirects protected routes to login when auth mode is enabled without a session", () => {
  const response = proxy(
    createRequest("/command", [`${AUTH_MODE_COOKIE}=${authModeValues.enabled}`])
  );

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "http://localhost:3000/auth/login?next=%2Fcommand"
  );
});

test("proxy allows protected routes through when auth mode is enabled and a session exists", () => {
  const response = proxy(
    createRequest("/captain/MV-1", [
      `${AUTH_MODE_COOKIE}=${authModeValues.enabled}`,
      `${AUTH_SESSION_COOKIE}=demo-session-token`,
    ])
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-middleware-next"), "1");
});
