import Link from "next/link";

import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/shell/section-card";
import { requireProtectedPageAccess } from "@/server/auth/current";

type ChangePasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    changed?: string;
  }>;
};

export default async function ChangePasswordPage({ searchParams }: ChangePasswordPageProps) {
  const { session } = await requireProtectedPageAccess("/auth/change-password");
  const { error, changed } = await searchParams;
  const errorMessage =
    error === "missing-fields"
      ? "Complete all password fields before submitting."
      : error === "password-mismatch"
        ? "The new password confirmation did not match."
        : error === "invalid-current"
          ? "The current password was incorrect."
          : error === "unavailable"
            ? "Password change is unavailable right now."
            : null;

  return (
    <AppShell
      eyebrow="Authentication v2"
      title="Change password"
      description="Update the password for the active protected-mode session."
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
        title="Password update"
        description="The current password is required before the new one is stored."
      >
        <div className="grid gap-4">
          {errorMessage ? (
            <p className="rounded-2xl border border-accent-strong/20 bg-orange-50/80 px-4 py-3 text-sm text-accent-strong">
              {errorMessage}
            </p>
          ) : null}

          {changed === "1" ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
              Password updated for {session.fullName}.
            </p>
          ) : null}

          <div className="rounded-2xl border border-line bg-white/70 p-4 text-sm leading-7 text-muted">
            Signed in as <span className="font-semibold text-foreground">{session.email}</span>
          </div>

          <form action="/api/auth/change-password" method="post" className="grid gap-3">
            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted">
                Current password
              </span>
              <input
                name="currentPassword"
                type="password"
                className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground"
              />
            </label>
            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted">
                New password
              </span>
              <input
                name="nextPassword"
                type="password"
                className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground"
              />
            </label>
            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted">
                Confirm new password
              </span>
              <input
                name="confirmPassword"
                type="password"
                className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground"
              />
            </label>
            <button
              type="submit"
              className="action-button-light rounded-full border border-accent bg-accent px-4 py-3 text-sm font-semibold shadow-sm shadow-accent/20"
            >
              Save password
            </button>
          </form>
        </div>
      </SectionCard>
    </AppShell>
  );
}
