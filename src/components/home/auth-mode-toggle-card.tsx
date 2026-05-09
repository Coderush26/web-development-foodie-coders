"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

import { SectionCard } from "@/components/shell/section-card";
import type { AuthMode } from "@/config/auth";

type AuthModeToggleCardProps = {
  initialMode: AuthMode;
  databaseConfigured: boolean;
  currentSession: {
    fullName: string;
    roles: string[];
    captainShipIds: string[];
  } | null;
};

export function AuthModeToggleCard({
  initialMode,
  databaseConfigured,
  currentSession,
}: AuthModeToggleCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateMode(nextMode: AuthMode) {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/mode", {
        method: nextMode === "enabled" ? "POST" : "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: nextMode === "enabled" ? JSON.stringify({ mode: nextMode }) : undefined,
      });

      if (!response.ok) {
        throw new Error("Failed to update protected mode.");
      }

      setMode(nextMode);
      startTransition(() => {
        router.refresh();
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Failed to update protected mode."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <SectionCard
      title="Authentication toggle"
      description="Keep the current open-access simulator as the default, then switch this browser into protected mode whenever you want to test Phase 1 auth foundations."
      tone={mode === "enabled" ? "accent" : undefined}
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/70 p-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted">Current mode</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {mode === "enabled" ? "Authentication enabled" : "Authentication disabled"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => updateMode(mode === "enabled" ? "disabled" : "enabled")}
            disabled={pending}
            className={`action-button-light rounded-full border px-4 py-2 text-sm font-semibold shadow-sm ${
              mode === "enabled"
                ? "border-accent-strong bg-accent-strong shadow-orange-900/10"
                : "border-accent bg-accent shadow-accent/20"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {pending
              ? "Updating..."
              : mode === "enabled"
                ? "Switch to no-auth mode"
                : "Switch to auth mode"}
          </button>
        </div>

        {!databaseConfigured ? (
          <p className="rounded-2xl border border-accent-strong/20 bg-orange-50/80 px-4 py-3 text-sm leading-7 text-accent-strong">
            DATABASE_URL is not configured here yet. The current no-auth simulator still works, but
            protected mode sign-in requires Postgres.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-accent-strong/20 bg-orange-50/80 px-4 py-3 text-sm text-accent-strong">
            {error}
          </p>
        ) : null}

        <div className="grid gap-3 text-sm leading-7 text-muted">
          <p>
            No-auth mode keeps the current project exactly as it works now. Protected mode turns on
            route and API guards for this browser only, so you can build auth in phases without
            breaking the core demo.
          </p>
          {mode === "enabled" && currentSession ? (
            <div className="rounded-2xl border border-line bg-white/70 p-4">
              <p className="font-semibold text-foreground">
                Signed in as {currentSession.fullName}
              </p>
              <p className="mt-1 text-sm text-muted">Roles: {currentSession.roles.join(", ")}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {currentSession.roles.includes("super_admin") ? (
                  <Link
                    href="/admin"
                    className="action-button-light rounded-full border border-accent-strong bg-accent-strong px-4 py-2 text-sm font-semibold shadow-sm shadow-orange-900/10"
                  >
                    Open admin console
                  </Link>
                ) : null}
                {currentSession.roles.includes("command") ||
                currentSession.roles.includes("super_admin") ? (
                  <Link
                    href="/command"
                    className="action-button-light rounded-full border border-accent bg-accent px-4 py-2 text-sm font-semibold shadow-sm shadow-accent/20"
                  >
                    Open protected command
                  </Link>
                ) : null}
                {currentSession.roles.includes("captain") && currentSession.captainShipIds[0] ? (
                  <Link
                    href={`/captain/${currentSession.captainShipIds[0]}`}
                    className="action-button-light rounded-full border border-foreground bg-foreground px-4 py-2 text-sm font-semibold shadow-sm shadow-slate-900/10"
                  >
                    Open assigned captain view
                  </Link>
                ) : null}
                <Link
                  href="/auth/change-password"
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm shadow-slate-900/5"
                >
                  Change password
                </Link>
                <Link
                  href="/auth/login"
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground shadow-sm shadow-slate-900/5"
                >
                  Open sign-in page
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className="action-button-light rounded-full border border-accent-strong bg-accent-strong px-4 py-2 text-sm font-semibold shadow-sm shadow-orange-900/10"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          ) : null}
          {mode === "enabled" && !currentSession ? (
            <div className="rounded-2xl border border-line bg-white/70 p-4">
              <p className="font-semibold text-foreground">
                Protected mode is on for this browser.
              </p>
              <p className="mt-1 text-sm text-muted">
                Sign in with the bootstrap admin account before opening protected routes.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  href="/auth/login?next=/command"
                  className="action-button-light rounded-full border border-accent bg-accent px-4 py-2 text-sm font-semibold shadow-sm shadow-accent/20"
                >
                  Sign in to protected mode
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}
