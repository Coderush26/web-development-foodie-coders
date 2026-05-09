import Link from "next/link";

import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/shell/section-card";
import { redirectSignedInUser } from "@/server/auth/current";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    sent?: string;
    preview?: string;
  }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const { error, sent, preview } = await searchParams;

  await redirectSignedInUser(null);

  const errorMessage =
    error === "missing-fields"
      ? "Enter the email address for the member account."
      : error === "unavailable"
        ? "Password reset is unavailable until the auth database is ready."
        : null;

  return (
    <AppShell
      eyebrow="Authentication v2"
      title="Forgot password"
      description="Request a one-time reset link for a verified Fleet Crisis Ops account."
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
        title="Reset request"
        description="A verified account receives a one-time reset link. Local runs also show a preview link so judges can complete the flow on one laptop."
      >
        <div className="grid gap-4">
          {errorMessage ? (
            <p className="rounded-2xl border border-accent-strong/20 bg-orange-50/80 px-4 py-3 text-sm text-accent-strong">
              {errorMessage}
            </p>
          ) : null}

          {sent === "1" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm leading-7 text-emerald-800">
              If that email belongs to a verified member, a reset link is now available.
              {preview ? (
                <>
                  {" "}
                  Local preview:{" "}
                  <Link href={preview} className="font-semibold underline">
                    open reset link
                  </Link>
                  .
                </>
              ) : null}
            </div>
          ) : null}

          <form action="/api/auth/forgot-password" method="post" className="grid gap-3">
            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-semibold uppercase tracking-[0.16em] text-muted">Email</span>
              <input
                name="email"
                type="email"
                placeholder="captain@fleet.local"
                className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground"
              />
            </label>
            <button
              type="submit"
              className="action-button-light rounded-full border border-accent bg-accent px-4 py-3 text-sm font-semibold shadow-sm shadow-accent/20"
            >
              Send reset link
            </button>
          </form>
        </div>
      </SectionCard>
    </AppShell>
  );
}
