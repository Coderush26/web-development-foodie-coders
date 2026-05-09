import Link from "next/link";

import { RoleEntryCard } from "@/components/home/role-entry-card";
import { ShipRosterPreview } from "@/components/home/ship-roster-preview";
import { SectionCard } from "@/components/shell/section-card";
import { appCopy, roleDefinitions } from "@/config/scenario";
import { listCaptainRouteSamples } from "@/features/fleet/data/scenario-seed";

export default function Home() {
  const captainSamples = listCaptainRouteSamples();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-6 py-8 lg:px-10 lg:py-12">
      <section className="relative overflow-hidden rounded-4xl border border-line bg-surface p-8 shadow-xl shadow-slate-900/5 backdrop-blur lg:p-10">
        <div className="absolute -right-14 top-0 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-accent-strong/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="font-mono text-sm uppercase tracking-[0.28em] text-accent">
                Access portal
              </p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
                Role-based entry for live operations
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-muted">
                {appCopy.summary} Use this route as the clean entry surface for navigation and
                future authentication. The detailed operational summary now lives on a dedicated
                overview page instead of crowding the home screen.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/overview"
                className="rounded-full border border-accent-strong bg-accent-strong px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-900/10 transition-transform hover:-translate-y-0.5"
              >
                Open system overview
              </Link>
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
          </div>

          <SectionCard
            title="Recommended access model"
            description="The challenge is graded around Command and Captain. Admin access should support those roles, not compete with them."
            tone="accent"
          >
            <div className="grid gap-3 text-sm leading-7 text-muted">
              {[
                "Keep the live runtime centered on the two required interfaces: Command and Captain.",
                "Use invitation-only onboarding for future auth so a super admin assigns the role before the first login.",
                "Let captains reach only their assigned ship route, while Command keeps fleet-wide control.",
                "Avoid open public sign-up on the judged build because it adds extra workflow without helping the core requirements.",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-line bg-white/70 px-4 py-3">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <RoleEntryCard {...roleDefinitions.command} />
        <SectionCard
          title="Super admin direction"
          description="Best fit for the next security phase without weakening the current operational brief."
        >
          <div className="grid gap-3 text-sm leading-7 text-muted">
            <div className="rounded-2xl border border-line bg-white/70 p-4">
              The super admin should manage people, roles, invitations, and ship assignments. It
              should not become a third live crisis role that distracts from Command and Captain.
            </div>
            <div className="rounded-2xl border border-line bg-white/70 p-4">
              The strongest onboarding flow for this project is admin-created invitations: enter
              name, email, role, and captain ship assignment, then let the user set their password
              from the invite link.
            </div>
            <div className="rounded-2xl border border-line bg-white/70 p-4">
              Self-sign-up with later approval is possible, but it adds unnecessary queue logic,
              public entry points, and edge cases that do not improve the judged operational core.
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ShipRosterPreview ships={captainSamples} />
        <RoleEntryCard {...roleDefinitions.captain} />
      </section>
    </main>
  );
}
