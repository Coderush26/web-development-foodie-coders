import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { resolveRequestAccess } from "@/server/auth/request";
import { scopeFleetSnapshotForSession } from "@/server/auth/scope";
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
  const requestedShipId = request.nextUrl.searchParams.get("shipId");
  const access = await resolveRequestAccess(request, {
    allowedRoles: ["super_admin", "command", "captain"],
    requiredCaptainShipId: requestedShipId ?? undefined,
  });

  if (access.response) {
    return access.response;
  }

  const fleetRuntime = getFleetRuntime();
  await fleetRuntime.ensureReady();
  fleetRuntime.start();
  const scopedSnapshot = scopeFleetSnapshotForSession(
    fleetRuntime.getSnapshot(),
    access.session,
    requestedShipId
  );

  if (!scopedSnapshot) {
    return NextResponse.json(
      { message: "You do not have access to this ship feed." },
      { status: 403 }
    );
  }

  return NextResponse.json(
    {
      ...fleetRuntime.getBootstrapPayload(resolveRealtimeTransport()),
      snapshot: scopedSnapshot,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
