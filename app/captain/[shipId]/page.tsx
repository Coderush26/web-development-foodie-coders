import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { getShipById } from "@/features/fleet/data/scenario-seed";
import { CaptainLiveDashboard } from "@/features/fleet/components/captain-live-dashboard";

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

  return (
    <AppShell
      eyebrow="Captain console"
      title={`${ship.name} bridge`}
      description="Operate a live ship-scoped dashboard for directives, alerts, route status, weather awareness, and distress escalation."
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            href="/command"
            className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-accent/20"
          >
            Open command center
          </Link>
          <Link
            href="/overview"
            className="rounded-full border border-accent-strong bg-accent-strong px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-900/10"
          >
            Open system overview
          </Link>
          <Link
            href="/"
            className="rounded-full border border-foreground bg-foreground px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-slate-900/10"
          >
            Open access portal
          </Link>
        </div>
      }
    >
      <CaptainLiveDashboard shipId={shipId} />
    </AppShell>
  );
}
