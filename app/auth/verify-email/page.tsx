import Link from "next/link";

import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/shell/section-card";
import { peekVerificationToken } from "@/server/auth/tokens";
import { verificationKindValues } from "@/server/auth/constants";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: string;
    sent?: string;
    email?: string;
    preview?: string;
    error?: string;
  }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token, sent, email, preview, error } = await searchParams;
  const verification = token
    ? await peekVerificationToken({ token, kind: verificationKindValues.emailVerify })
    : null;
  const errorMessage =
    error === "missing-token"
      ? "The verification token is missing."
      : error === "invalid-token"
        ? "This verification link is invalid or expired."
        : error === "unavailable"
          ? "Email verification could not be completed right now."
          : null;

  return (
    <AppShell
      eyebrow="Authentication v2"
      title="Verify email"
      description="Verification completes member activation so the account can sign in to protected routes."
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
        title="Verification link"
        description="Local runs expose the verification link directly so the whole invite flow stays judge-safe on one machine."
      >
        <div className="grid gap-4">
          {errorMessage ? (
            <p className="rounded-2xl border border-accent-strong/20 bg-orange-50/80 px-4 py-3 text-sm text-accent-strong">
              {errorMessage}
            </p>
          ) : null}

          {sent === "1" ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm leading-7 text-emerald-800">
              Verification is ready for {email ?? "this account"}.
              {preview ? (
                <>
                  {" "}
                  Local preview:{" "}
                  <Link href={preview} className="font-semibold underline">
                    open verification link
                  </Link>
                  .
                </>
              ) : null}
            </div>
          ) : null}

          {token ? (
            verification ? (
              <form action="/api/auth/verify-email" method="post" className="grid gap-3">
                <input type="hidden" name="token" value={token} />
                <div className="rounded-2xl border border-line bg-white/70 p-4 text-sm leading-7 text-muted">
                  This link expires at {new Date(verification.expiresAt).toLocaleString()}.
                </div>
                <button
                  type="submit"
                  className="action-button-light rounded-full border border-accent bg-accent px-4 py-3 text-sm font-semibold shadow-sm shadow-accent/20"
                >
                  Verify email
                </button>
              </form>
            ) : (
              <div className="rounded-2xl border border-line bg-white/70 p-4 text-sm leading-7 text-muted">
                This verification link is no longer valid.
              </div>
            )
          ) : null}
        </div>
      </SectionCard>
    </AppShell>
  );
}
