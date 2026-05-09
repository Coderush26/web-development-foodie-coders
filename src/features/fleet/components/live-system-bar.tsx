"use client";

import { useEffect, useState } from "react";

import type { FleetDisplayShip } from "@/features/fleet/hooks/use-interpolated-fleet-view";
import type { FleetRuntimeSnapshot } from "@/types/realtime";

type LiveSystemBarProps = {
  roleLabel: string;
  connectionState: string;
  snapshot: FleetRuntimeSnapshot | null;
  highlightedShip?: FleetDisplayShip | null;
};

function formatLastUpdate(generatedAt: string | undefined, now: number) {
  if (!generatedAt) {
    return "Awaiting first tick";
  }

  const elapsedSeconds = Math.max(0, Math.round((now - Date.parse(generatedAt)) / 1000));

  if (elapsedSeconds < 1) {
    return "just now";
  }

  return `${elapsedSeconds}s ago`;
}

function connectionClasses(connectionState: string) {
  if (connectionState === "open") {
    return "border-accent/20 bg-emerald-50 text-accent";
  }

  if (connectionState === "error") {
    return "border-accent-strong/20 bg-orange-50 text-accent-strong";
  }

  return "border-line bg-white/70 text-muted";
}

export function LiveSystemBar({
  roleLabel,
  connectionState,
  snapshot,
  highlightedShip,
}: LiveSystemBarProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const cards = [
    {
      label: "Role",
      value: roleLabel,
      classes: "border-line bg-white/70 text-foreground",
    },
    {
      label: "Connection",
      value: connectionState,
      classes: connectionClasses(connectionState),
    },
    {
      label: "Last update",
      value: formatLastUpdate(snapshot?.generatedAt, now),
      classes: "border-line bg-white/70 text-foreground",
    },
    {
      label: "Fleet summary",
      value: snapshot
        ? `${snapshot.telemetry.movingShips} moving / ${snapshot.telemetry.arrivedShips} arrived`
        : "Awaiting runtime",
      classes: "border-line bg-white/70 text-foreground",
    },
    {
      label: "Focus",
      value: highlightedShip
        ? `${highlightedShip.name} · ${highlightedShip.status}`
        : "Select a ship",
      classes: "border-line bg-white/70 text-foreground",
    },
  ];

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl border px-4 py-3 shadow-lg shadow-slate-900/5 ${card.classes}`}
        >
          <p className="text-xs uppercase tracking-[0.22em] text-muted">{card.label}</p>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.08em]">{card.value}</p>
        </div>
      ))}
    </section>
  );
}
