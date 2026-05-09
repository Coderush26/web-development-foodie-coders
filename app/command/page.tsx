import Link from "next/link";

import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/shell/section-card";
import { phaseOneWorkstreams } from "@/config/scenario";
import {
  getFleetOverview,
  getFleetScenarioSeed,
  getPortById,
} from "@/features/fleet/data/scenario-seed";

export default function CommandPage() {
  const overview = getFleetOverview();
  const ships = getFleetScenarioSeed().ships.slice(0, 5);

  return (
    <AppShell
      eyebrow="Phase 1 / Command"
      title="Fleet command shell"
      description="This is the operator-facing foundation for the control room. It is intentionally static in Phase 1, but it already knows the real scenario, real ships, and the boundaries of later features."
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-semibold text-foreground"
          >
            Back to overview
          </Link>
          <Link
            href="/captain/MV-1"
            className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background"
          >
            Open captain sample
          </Link>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionCard
          title="Scenario control baseline"
          description="The command route is already wired to the fleet seed and grading targets."
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted">Ships loaded</dt>
              <dd className="mt-1 text-2xl font-semibold text-foreground">{overview.shipCount}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Ports loaded</dt>
              <dd className="mt-1 text-2xl font-semibold text-foreground">{overview.portCount}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Bounding box</dt>
              <dd className="mt-1 text-sm leading-7 text-muted">
                {overview.bounds.south} to {overview.bounds.north} lat, {overview.bounds.west} to{" "}
                {overview.bounds.east} lng
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Phase scope</dt>
              <dd className="mt-1 text-sm leading-7 text-muted">
                Layout, shared domain, route shells, and scenario loading only.
              </dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard
          title="What comes next"
          description="Command-specific behavior is intentionally deferred into later phases."
        >
          <ul className="space-y-3 text-sm leading-7 text-muted">
            <li>Phase 2: authoritative simulation tick and WebSocket delivery.</li>
            <li>Phase 3: live fleet map, interpolation, and ship detail inspection.</li>
            <li>Phase 4: zone drawing, geofence detection, and alert acknowledgement.</li>
            <li>Phase 5 onward: directives, captain responses, routing, weather, and playback.</li>
          </ul>
        </SectionCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {phaseOneWorkstreams.map((workstream) => (
          <SectionCard
            key={workstream.title}
            title={workstream.title}
            description={workstream.body}
          >
            <p className="text-sm leading-7 text-muted">{workstream.detail}</p>
          </SectionCard>
        ))}
      </div>

      <SectionCard
        title="Fleet seed preview"
        description="These are live seed values from the shared scenario loader, not hard-coded UI text."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {ships.map((ship) => {
            const destination = getPortById(ship.destinationPortId);

            return (
              <div key={ship.shipId} className="rounded-2xl border border-line bg-white/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
                      {ship.shipId}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-foreground">{ship.name}</h2>
                  </div>
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {ship.status}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.2em] text-muted">Cargo</dt>
                    <dd className="mt-1 text-sm text-foreground">{ship.cargo}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.2em] text-muted">Destination</dt>
                    <dd className="mt-1 text-sm text-foreground">
                      {destination?.name ?? ship.destinationPortId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.2em] text-muted">Speed</dt>
                    <dd className="mt-1 text-sm text-foreground">{ship.speedKnots} knots</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.2em] text-muted">Fuel</dt>
                    <dd className="mt-1 text-sm text-foreground">{ship.fuelTons} tons</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </AppShell>
  );
}
