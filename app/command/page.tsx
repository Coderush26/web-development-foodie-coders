import Link from "next/link";

import { AppShell } from "@/components/shell/app-shell";
import { CommandLiveDashboard } from "@/features/fleet/components/command-live-dashboard";

export default function CommandPage() {
  return (
    <AppShell
      eyebrow="Command center"
      title="Fleet command"
      description="Monitor the full fleet, manage restricted zones, coordinate alerts, issue directives, and review playback from a single live control surface."
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-semibold text-foreground"
          >
            Back to navigation
          </Link>
          <Link
            href="/captain/MV-1"
            className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-accent/20"
          >
            Open captain console
          </Link>
        </div>
      }
    >
      <CommandLiveDashboard />
    </AppShell>
  );
}
