import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { CaptainLiveDashboard } from "@/features/fleet/components/captain-live-dashboard";
import { getShipById } from "@/features/fleet/data/scenario-seed";

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
      eyebrow="Phase 3 / Captain"
      title={`${ship.name} bridge console`}
      description="The captain view is now a real ship-scoped map dashboard: your vessel stays in focus, the movement is smooth between ticks, and nearby fleet context stays readable without breaking role scope."
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
      <CaptainLiveDashboard shipId={ship.shipId} />
    </AppShell>
  );
}
