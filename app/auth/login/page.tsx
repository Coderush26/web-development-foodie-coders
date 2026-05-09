import Link from "next/link";

import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/shell/section-card";
import { isAuthDatabaseConfigured } from "@/server/auth/db";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams;
  const databaseConfigured = isAuthDatabaseConfigured();
  const errorMessage =
    error === "missing-fields"
      ? "Enter both email and password."
      : error === "invalid-credentials"
        ? "That email or password did not match the bootstrap admin account."
        : error === "unavailable"
          ? "Protected mode is on, but the auth database is not ready yet."
          : null;

  return (
    <AppShell
      eyebrow="Authentication v2"
      title="Protected mode entry"
      description="Phase 1 adds DB-backed protected mode while keeping the existing open-access simulation untouched whenever auth mode is turned off."
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="action-button-light rounded-full border border-foreground bg-foreground px-4 py-2 text-sm font-semibold shadow-sm shadow-slate-900/10"
          >
            Open access portal
          </Link>
        </div>
      }
    >
      <SectionCard
        title="Phase 1 foundation"
        description="Protected mode now has a bootstrap admin sign-in, optional Postgres backing, and session cookies that only matter when auth mode is enabled."
      >
        <div className="grid gap-4">
          {errorMessage ? (
            <p className="rounded-2xl border border-accent-strong/20 bg-orange-50/80 px-4 py-3 text-sm text-accent-strong">
              {errorMessage}
            </p>
          ) : null}

          {!databaseConfigured ? (
            <div className="rounded-2xl border border-accent-strong/20 bg-orange-50/80 px-4 py-3 text-sm leading-7 text-accent-strong">
              DATABASE_URL is not configured in this environment. Auth mode can be toggled on, but
              sign-in will not work until Postgres is available.
            </div>
          ) : null}

          <form action="/api/auth/login" method="post" className="grid gap-3">
            <input type="hidden" name="next" value={next ?? "/command"} />
            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted">Email</span>
              <input
                name="email"
                type="email"
                defaultValue="admin@fleet.local"
                className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground"
              />
            </label>
            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted">Password</span>
              <input
                name="password"
                type="password"
                defaultValue="ChangeMe123!"
                className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground"
              />
            </label>
            <button
              type="submit"
              className="action-button-light rounded-full border border-accent bg-accent px-4 py-3 text-sm font-semibold shadow-sm shadow-accent/20"
            >
              Sign in to protected mode
            </button>
          </form>

          <div className="grid gap-2 text-sm leading-7 text-muted">
            <p>
              Requested route: <span className="font-mono text-accent">{next ?? "/command"}</span>
            </p>
            <p>
              Bootstrap admin defaults:{" "}
              <span className="font-mono text-accent">admin@fleet.local</span> and{" "}
              <span className="font-mono text-accent">ChangeMe123!</span>.
            </p>
            <p>
              Override them with AUTH_BOOTSTRAP_ADMIN_EMAIL, AUTH_BOOTSTRAP_ADMIN_PASSWORD, and
              AUTH_BOOTSTRAP_ADMIN_NAME when you want a different local owner.
            </p>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
