import Link from "next/link";

import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/shell/section-card";
import { peekPasswordReset } from "@/server/auth/flows";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
    error?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token, error } = await searchParams;
  const resetTarget = token ? await peekPasswordReset(token) : null;
  const errorMessage =
    error === "missing-fields"
      ? "Enter and confirm the new password."
      : error === "password-mismatch"
        ? "The password confirmation did not match."
        : error === "invalid-token"
          ? "This reset link is invalid or expired. Request a new one."
          : error === "unavailable"
            ? "Password reset could not be completed right now."
            : null;

  return (
    <AppShell
      eyebrow="Authentication v2"
      title="Reset password"
      description="Finish the password reset with the one-time link sent to the verified member account."
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            href="/auth/login"
            className="action-button-light rounded-full border border-accent bg-accent px-4 py-2 text-sm font-semibold shadow-sm shadow-accent/20"
          >
            Back to sign in
          </Link>
        </div>
      }
    >
      <SectionCard
        title="Choose a new password"
        description="The reset link stays valid for a short window only."
      >
        <div className="grid gap-4">
          {errorMessage ? (
            <p className="rounded-2xl border border-accent-strong/20 bg-orange-50/80 px-4 py-3 text-sm text-accent-strong">
              {errorMessage}
            </p>
          ) : null}

          {!token || !resetTarget ? (
            <div className="rounded-2xl border border-line bg-white/70 p-4 text-sm leading-7 text-muted">
              The reset link is missing or has already expired.
            </div>
          ) : (
            <form action="/api/auth/reset-password" method="post" className="grid gap-3">
              <input type="hidden" name="token" value={token} />
              <div className="rounded-2xl border border-line bg-white/70 p-4 text-sm leading-7 text-muted">
                Resetting password for{" "}
                <span className="font-semibold text-foreground">{resetTarget.email}</span>
              </div>
              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-semibold uppercase tracking-[0.16em] text-muted">
                  New password
                </span>
                <input
                  name="password"
                  type="password"
                  className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground"
                />
              </label>
              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-semibold uppercase tracking-[0.16em] text-muted">
                  Confirm password
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
                Save new password
              </button>
            </form>
          )}
        </div>
      </SectionCard>
    </AppShell>
  );
}
