import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { getShipById } from "@/features/fleet/data/scenario-seed";
import { CaptainLiveDashboard } from "@/features/fleet/components/captain-live-dashboard";
import { requirePageAccess } from "@/server/auth/current";

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

  const { authMode, session } = await requirePageAccess(`/captain/${shipId}`);

  return (
    <AppShell
      eyebrow="Captain console"
      title={`${ship.name} bridge`}
      description="Operate a live ship-scoped dashboard for directives, alerts, route status, weather awareness, and distress escalation."
      actions={
        <div className="flex flex-wrap gap-3">
          {authMode === "enabled" && session?.roles.includes("super_admin") ? (
            <Link
              href="/admin"
              className="action-button-light rounded-full border border-accent-strong bg-accent-strong px-4 py-2 text-sm font-semibold shadow-sm shadow-orange-900/10"
            >
              Open admin console
            </Link>
          ) : null}
          {authMode === "enabled" && session?.roles.includes("super_admin") ? (
            <Link
              href="/command"
              className="action-button-light rounded-full border border-accent bg-accent px-4 py-2 text-sm font-semibold shadow-sm shadow-accent/20"
            >
              Open command center
            </Link>
          ) : null}
          <Link
            href="/overview"
            className="action-button-light rounded-full border border-accent-strong bg-accent-strong px-4 py-2 text-sm font-semibold shadow-sm shadow-orange-900/10"
          >
            Open system overview
          </Link>
          <Link
            href="/"
            className="action-button-light rounded-full border border-foreground bg-foreground px-4 py-2 text-sm font-semibold shadow-sm shadow-slate-900/10"
          >
            Open access portal
          </Link>
          {authMode === "enabled" ? (
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="action-button-light rounded-full border border-accent bg-accent px-4 py-2 text-sm font-semibold shadow-sm shadow-accent/20"
              >
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      }
    >
      <CaptainLiveDashboard shipId={shipId} />
    </AppShell>
  );
}
