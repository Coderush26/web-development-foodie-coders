import Link from "next/link";

import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/shell/section-card";
import { isAuthDatabaseConfigured } from "@/server/auth/db";
import { redirectSignedInUser } from "@/server/auth/current";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
    verified?: string;
    reset?: string;
    changed?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error, verified, reset, changed } = await searchParams;

  await redirectSignedInUser(next ?? null);

  const databaseConfigured = isAuthDatabaseConfigured();
  const errorMessage =
    error === "missing-fields"
      ? "Enter both email and password."
      : error === "invalid-credentials"
        ? "That email or password did not match an active member account."
        : error === "invite-pending"
          ? "This account still needs to accept its invitation before it can sign in."
          : error === "email-unverified"
            ? "This account still needs email verification before it can sign in."
            : error === "account-disabled"
              ? "This account is disabled. Ask a super admin to reactivate it."
              : error === "unavailable"
                ? "Protected mode is on, but the auth database is not ready yet."
                : null;
  const statusMessage =
    verified === "1"
      ? "Email verified. You can sign in now."
      : reset === "1"
        ? "Password reset complete. Sign in with the new password."
        : changed === "1"
          ? "Password changed successfully."
          : null;

  return (
    <AppShell
      eyebrow="Authentication v2"
      title="Protected mode entry"
      description="Phase 2 keeps the optional protected-mode foundation, then adds invite-based members, email verification, password recovery, and role-aware redirects after sign-in."
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
        title="Protected mode sign in"
        description="Super admins, command members, and captains now share the same sign-in screen. Invite-based users finish setup through their own email links first."
      >
        <div className="grid gap-4">
          {statusMessage ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
              {statusMessage}
            </p>
          ) : null}

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

          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/auth/forgot-password" className="font-semibold text-accent underline">
              Forgot password?
            </Link>
            <Link href="/auth/change-password" className="font-semibold text-accent underline">
              Change password
            </Link>
          </div>

          <div className="grid gap-2 text-sm leading-7 text-muted">
            <p>
              Requested route: <span className="font-mono text-accent">{next ?? "/command"}</span>
            </p>
            <p>
              Bootstrap admin defaults:{" "}
              <span className="font-mono text-accent">admin@fleet.local</span> and{" "}
              <span className="font-mono text-accent">ChangeMe123!</span>. New invited members use
              their own invite links instead of these defaults.
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
