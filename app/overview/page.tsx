import Link from "next/link";

import { RoleEntryCard } from "@/components/home/role-entry-card";
import { ShipRosterPreview } from "@/components/home/ship-roster-preview";
import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/shell/section-card";
import { appCopy, gradingThresholds, roleDefinitions } from "@/config/scenario";
import { getFleetOverview, listCaptainRouteSamples } from "@/features/fleet/data/scenario-seed";

export default function OverviewPage() {
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
    <AppShell
      eyebrow="System overview"
      title={appCopy.name}
      description="Review the operational scope, live thresholds, and route responsibilities without turning the home page into a project-overview screen."
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="action-button-light rounded-full border border-foreground bg-foreground px-4 py-2 text-sm font-semibold shadow-sm shadow-slate-900/10"
          >
            Open access portal
          </Link>
          <Link
            href={roleDefinitions.command.href}
            className="action-button-light rounded-full border border-accent bg-accent px-4 py-2 text-sm font-semibold shadow-sm shadow-accent/20"
          >
            Open command center
          </Link>
          <Link
            href={roleDefinitions.captain.href}
            className="action-button-light rounded-full border border-accent-strong bg-accent-strong px-4 py-2 text-sm font-semibold shadow-sm shadow-orange-900/10"
          >
            Open captain console
          </Link>
        </div>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-line bg-white/70 p-4">
            <p className="text-sm text-muted">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Operational scope"
          description="These are the fixed scenario boundaries and judging expectations that shape the current build."
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
            The detailed operating surfaces remain on the Command and Captain routes, while this
            page keeps the high-level system picture in one place.
          </div>
        </SectionCard>

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

      <section className="grid gap-6 lg:grid-cols-2">
        <RoleEntryCard {...roleDefinitions.command} />
        <RoleEntryCard {...roleDefinitions.captain} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <ShipRosterPreview ships={captainSamples} />
        <SectionCard
          title="Core system capabilities"
          description="These are the behaviors already live in the current command runtime."
        >
          <div className="grid gap-3">
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
              <div key={item.title} className="rounded-2xl border border-line bg-white/70 p-4">
                <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>
    </AppShell>
  );
}
