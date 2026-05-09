import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/shell/section-card";
import { LiveFleetPanel } from "@/features/fleet/components/live-fleet-panel";
import {
  getPortById,
  getShipById,
  listCaptainRouteSamples,
} from "@/features/fleet/data/scenario-seed";

type CaptainPageProps = {
  params: Promise<{
    shipId: string;
  }>;
};

export default async function CaptainPage({ params }: CaptainPageProps) {
  const { shipId } = await params;
  const ship = getShipById(shipId);

  if (!ship) {
    notFound();
  }

  const destination = getPortById(ship.destinationPortId);
  const captainSamples = listCaptainRouteSamples();

  return (
    <AppShell
      eyebrow="Phase 2 / Captain"
      title={`${ship.name} bridge console`}
      description="This route remains ship-scoped, but it now subscribes to the live fleet runtime so the bridge sees authoritative movement, fuel burn, and arrival progress in real time."
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            href="/command"
            className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-semibold text-foreground"
          >
            Open Command shell
          </Link>
          <Link
            href="/"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
          >
            Back to overview
          </Link>
        </div>
      }
    >
      <LiveFleetPanel
        shipId={ship.shipId}
        title="Live ship runtime"
        description="The bridge console uses the same authoritative simulation feed as Command, narrowed to the assigned vessel so later captain workflows can build on stable realtime state."
      />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Assigned vessel"
          description="This page stays keyed by ship ID and now pairs the seed-backed identity with live runtime state."
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted">Ship ID</dt>
              <dd className="mt-1 text-2xl font-semibold text-foreground">{ship.shipId}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Operational status</dt>
              <dd className="mt-1 text-2xl font-semibold text-foreground">{ship.status}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Cargo</dt>
              <dd className="mt-1 text-sm leading-7 text-muted">{ship.cargo}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Destination</dt>
              <dd className="mt-1 text-sm leading-7 text-muted">
                {destination?.name ?? ship.destinationPortId}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Speed / heading</dt>
              <dd className="mt-1 text-sm leading-7 text-muted">
                {ship.speedKnots} knots / {ship.headingDegrees}&deg;
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Fuel</dt>
              <dd className="mt-1 text-sm leading-7 text-muted">{ship.fuelTons} tons remaining</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard
          title="Captain roadmap"
          description="Phase 2 gives captains live awareness. The interactive workflows still arrive later."
        >
          <ul className="space-y-3 text-sm leading-7 text-muted">
            <li>Phase 3 adds a ship-scoped live map and richer shared situational context.</li>
            <li>Phase 5 adds directive inbox, accept flow, and distress escalation.</li>
            <li>Phase 6 adds route, fuel feasibility, weather, and proximity awareness.</li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Quick captain route checks"
        description="Use these sample links to verify ship-scoped rendering without changing the route structure later."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {captainSamples.map((sample) => (
            <Link
              key={sample.shipId}
              href={sample.href}
              className="rounded-2xl border border-line bg-white/70 p-4 transition-transform hover:-translate-y-0.5"
            >
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
                {sample.shipId}
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{sample.name}</p>
              <p className="mt-1 text-sm text-muted">{sample.destinationName}</p>
            </Link>
          ))}
        </div>
      </SectionCard>
    </AppShell>
  );
}
