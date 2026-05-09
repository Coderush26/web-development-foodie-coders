import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { resolveRequestAccess } from "@/server/auth/request";
import { getFleetRuntime } from "@/server/simulation/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveRealtimeTransport() {
  if (process.env.VERCEL) {
    return {
      socketPath: null,
      realtimeTransport: "snapshot" as const,
      transportMessage:
        "This host cannot run the custom WebSocket runtime. Snapshot mode stays available here, but full live sync still requires Docker or a Node host.",
    };
  }

  return {
    socketPath: undefined,
    realtimeTransport: "websocket" as const,
    transportMessage: null,
  };
}

export async function GET(request: NextRequest) {
  const access = await resolveRequestAccess(request, {
    allowedRoles: ["super_admin", "command", "captain"],
  });

  if (access.response) {
    return access.response;
  }

  const fleetRuntime = getFleetRuntime();
  fleetRuntime.start();

  return NextResponse.json(fleetRuntime.getBootstrapPayload(resolveRealtimeTransport()), {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
