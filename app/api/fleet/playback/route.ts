import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { resolveRequestAccess } from "@/server/auth/request";
import { getFleetRuntime } from "@/server/simulation/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await resolveRequestAccess(request, {
    allowedRoles: ["super_admin", "command"],
  });

  if (access.response) {
    return access.response;
  }

  const fleetRuntime = getFleetRuntime();
  await fleetRuntime.ensureReady();
  fleetRuntime.start();

  return NextResponse.json(fleetRuntime.getPlaybackHistory(), {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
