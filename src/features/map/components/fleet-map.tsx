"use client";

import dynamic from "next/dynamic";

import type { FleetMapCanvasProps } from "@/features/map/components/fleet-map-canvas";

const FleetMapCanvas = dynamic(
  () =>
    import("@/features/map/components/fleet-map-canvas").then((module) => module.FleetMapCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-104 items-center justify-center bg-background-strong/70 text-sm text-muted lg:min-h-136">
        Loading interactive map surface...
      </div>
    ),
  }
);

export function FleetMap(props: FleetMapCanvasProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-background-strong/70">
      <FleetMapCanvas {...props} />
    </div>
  );
}
