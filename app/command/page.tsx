import Link from "next/link";

import { AppShell } from "@/components/shell/app-shell";
import { CommandLiveDashboard } from "@/features/fleet/components/command-live-dashboard";

export default function CommandPage() {
  return (
    <AppShell
      eyebrow="Phase 3 / Command"
      title="Fleet command dashboard"
      description="Command now works from a real live map: the fleet is visible as continuous motion, every ship is selectable, and operational details stay pinned to the authoritative runtime."
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
      <CommandLiveDashboard />
    </AppShell>
  );
}
