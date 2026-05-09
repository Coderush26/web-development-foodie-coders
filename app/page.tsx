import Link from "next/link";

import { RoleEntryCard } from "@/components/home/role-entry-card";
import { ServiceReadiness } from "@/components/home/service-readiness";
import { ShipRosterPreview } from "@/components/home/ship-roster-preview";
import { SectionCard } from "@/components/shell/section-card";
import { externalServices, optionalEnvNames } from "@/config/runtime";
import {
  appCopy,
  gradingThresholds,
  phaseOneWorkstreams,
  roleDefinitions,
} from "@/config/scenario";
import { getFleetOverview, listCaptainRouteSamples } from "@/features/fleet/data/scenario-seed";

export default function Home() {
  const overview = getFleetOverview();
  const captainSamples = listCaptainRouteSamples();
  const metrics = [
    { label: "Active ships", value: `${overview.shipCount}` },
    { label: "Ports in seed", value: `${overview.portCount}` },
    { label: "Live tick target", value: `${gradingThresholds.minUpdateRateHz} Hz` },
    { label: "Alert deadline", value: `${gradingThresholds.geofenceAlertDeadlineMs / 1000}s` },
  ];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 lg:px-10 lg:py-12">
      <section className="relative overflow-hidden rounded-4xl border border-line bg-surface p-8 shadow-xl shadow-slate-900/5 backdrop-blur lg:p-10">
        <div className="absolute -right-14 top-0 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-accent-strong/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="font-mono text-sm uppercase tracking-[0.28em] text-accent">
                Phase 1 foundation
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
                {appCopy.name}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted">{appCopy.summary}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={roleDefinitions.command.href}
                className="rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5"
              >
                Open Command shell
              </Link>
              <Link
                href={roleDefinitions.captain.href}
                className="rounded-full border border-line bg-white/65 px-5 py-3 text-sm font-semibold text-foreground transition-transform hover:-translate-y-0.5"
              >
                Open Captain shell
              </Link>
              <Link
                href="/docs/phases.md"
                className="rounded-full border border-dashed border-line px-5 py-3 text-sm font-semibold text-muted transition-transform hover:-translate-y-0.5"
              >
                Review execution phases
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-2xl border border-line bg-white/70 p-4">
                  <p className="text-sm text-muted">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          <SectionCard
            title="Scenario snapshot"
            description="Phase 1 keeps the app static but grounded in the real grading seed."
            tone="accent"
          >
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted">Operational area</dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">Strait of Hormuz</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Navigable polygon points</dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {overview.navigableVertexCount}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Concurrent viewers target</dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {gradingThresholds.minConcurrentWatchers}+
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Playback window</dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {gradingThresholds.playbackWindowMinutes} min @{" "}
                  {gradingThresholds.playbackResolutionSeconds}s
                </dd>
              </div>
            </dl>
          </SectionCard>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <RoleEntryCard {...roleDefinitions.command} />
        <RoleEntryCard {...roleDefinitions.captain} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ShipRosterPreview ships={captainSamples} />
        <ServiceReadiness services={externalServices} envNames={optionalEnvNames} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {phaseOneWorkstreams.map((workstream) => (
          <SectionCard
            key={workstream.title}
            title={workstream.title}
            description={workstream.body}
          >
            <p className="text-sm leading-7 text-muted">{workstream.detail}</p>
          </SectionCard>
        ))}
      </section>
    </main>
  );
}
