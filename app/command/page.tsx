import Link from "next/link";

import { AppShell } from "@/components/shell/app-shell";
import { CommandLiveDashboard } from "@/features/fleet/components/command-live-dashboard";
import { requirePageAccess } from "@/server/auth/current";

export default async function CommandPage() {
  const { authMode, session } = await requirePageAccess("/command");

  return (
    <AppShell
      eyebrow="Command center"
      title="Fleet command"
      description="Monitor the full fleet, manage restricted zones, coordinate alerts, issue directives, and review playback from a single live control surface."
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
          <Link
            href="/"
            className="action-button-light rounded-full border border-foreground bg-foreground px-4 py-2 text-sm font-semibold shadow-sm shadow-slate-900/10"
          >
            Open access portal
          </Link>
          <Link
            href="/overview"
            className="action-button-light rounded-full border border-accent-strong bg-accent-strong px-4 py-2 text-sm font-semibold shadow-sm shadow-orange-900/10"
          >
            Open system overview
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
          ) : (
            <Link
              href="/captain/MV-1"
              className="action-button-light rounded-full border border-accent bg-accent px-4 py-2 text-sm font-semibold shadow-sm shadow-accent/20"
            >
              Open captain console
            </Link>
          )}
        </div>
      }
    >
      <CommandLiveDashboard />
    </AppShell>
  );
}
