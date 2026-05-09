import Link from "next/link";

import { RoleEntryCard } from "@/components/home/role-entry-card";
import { ShipRosterPreview } from "@/components/home/ship-roster-preview";
import { SectionCard } from "@/components/shell/section-card";
import { appCopy, gradingThresholds, roleDefinitions } from "@/config/scenario";
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
  const operationalHighlights = [
    {
      title: "Live command control",
      body: "Monitor all 15 ships, draw restricted zones, handle alerts, and issue directives from one operational dashboard.",
    },
    {
      title: "Captain response",
      body: "Each captain route is ship-scoped, receives directives in real time, and can accept or escalate distress with structured impact.",
    },
    {
      title: "Playback and review",
      body: "Command can switch into read-only playback, scrub the last hour of fleet history, and review the related event trail.",
    },
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
                Operational navigation
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
                {appCopy.name}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted">{appCopy.summary}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={roleDefinitions.command.href}
                className="rounded-full border border-accent bg-accent px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition-transform hover:-translate-y-0.5"
              >
                Open command center
              </Link>
              <Link
                href={roleDefinitions.captain.href}
                className="rounded-full border border-foreground bg-foreground px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-slate-900/10 transition-transform hover:-translate-y-0.5"
              >
                Open captain console
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
            title="Operational scope"
            description="Use the home page as a routing point into the live command and captain dashboards."
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
            <div className="mt-5 rounded-2xl border border-line bg-white/70 p-4 text-sm leading-7 text-muted">
              Launch Fleet Command to manage the whole situation, or open a captain console to work
              from a single ship&apos;s bridge view.
            </div>
          </SectionCard>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <RoleEntryCard {...roleDefinitions.command} />
        <RoleEntryCard {...roleDefinitions.captain} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ShipRosterPreview ships={captainSamples} />
        <SectionCard
          title="What each dashboard handles"
          description="The command and captain routes share the same live backend, but each page is focused on a different operational role."
        >
          <div className="grid gap-3">
            {operationalHighlights.map((item) => (
              <div key={item.title} className="rounded-2xl border border-line bg-white/70 p-4">
                <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Restricted zones and alerts",
            body: "Command can draw or edit zones, and the shared alert model tracks geofence, routing, weather, distress, and proximity issues in one place.",
          },
          {
            title: "Directives and distress",
            body: "Command sends directives, captains respond immediately, and free-form distress messages are converted into structured operational alerts.",
          },
          {
            title: "Playback and diagnostics",
            body: "The command dashboard includes a playback timeline and runtime diagnostics for cadence, weather mode, and buffer depth.",
          },
        ].map((item) => (
          <SectionCard key={item.title} title={item.title}>
            <p className="text-sm leading-7 text-muted">{item.body}</p>
          </SectionCard>
        ))}
      </section>
    </main>
  );
}
