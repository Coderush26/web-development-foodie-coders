import { NextResponse } from "next/server";

import { getFleetRuntime } from "@/server/simulation/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const fleetRuntime = getFleetRuntime();
  fleetRuntime.start();

  return NextResponse.json(fleetRuntime.getDiagnostics(), {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
