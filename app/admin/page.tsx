import Link from "next/link";

import { AuditTrailCard } from "@/features/admin/components/audit-trail-card";
import { MemberCreateCard } from "@/features/admin/components/member-create-card";
import { MemberDirectoryCard } from "@/features/admin/components/member-directory-card";
import { AppShell } from "@/components/shell/app-shell";
import { SectionCard } from "@/components/shell/section-card";
import { listRecentAuditLogs } from "@/server/auth/audit";
import { listAdminMembers, listFleetShipRegistry } from "@/server/auth/members";
import { requireProtectedPageAccess } from "@/server/auth/current";

type AdminPageProps = {
  searchParams: Promise<{
    status?: string;
    error?: string;
    invite?: string;
  }>;
};

function getStatusMessage(status: string | undefined) {
  if (status === "member-created") {
    return "Member created and invitation generated.";
  }

  if (status === "invite-resent") {
    return "Fresh invitation link generated.";
  }

  if (status === "member-updated") {
    return "Member access updated.";
  }

  return null;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { session } = await requireProtectedPageAccess("/admin");
  const { status, error, invite } = await searchParams;
  const [members, ships, auditEntries] = await Promise.all([
    listAdminMembers(),
    listFleetShipRegistry(),
    listRecentAuditLogs(16),
  ]);

  return (
    <AppShell
      eyebrow="Super admin"
      title="Member control"
      description="Invite members, fix their role boundaries, keep captain ship assignments accurate, and manage the protected-mode access lifecycle."
      actions={
        <div className="flex flex-wrap gap-3">
          <Link
            href="/command"
            className="action-button-light rounded-full border border-accent bg-accent px-4 py-2 text-sm font-semibold shadow-sm shadow-accent/20"
          >
            Open command center
          </Link>
          <Link
            href="/auth/change-password"
            className="action-button-light rounded-full border border-accent-strong bg-accent-strong px-4 py-2 text-sm font-semibold shadow-sm shadow-orange-900/10"
          >
            Change password
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="action-button-light rounded-full border border-foreground bg-foreground px-4 py-2 text-sm font-semibold shadow-sm shadow-slate-900/10"
            >
              Sign out
            </button>
          </form>
        </div>
      }
    >
      <SectionCard
        title="Protected-mode owner"
        description="Phase 2 treats super admin as the access-control owner, not as a competing live-operations role."
      >
        <div className="grid gap-3 text-sm leading-7 text-muted">
          <div className="rounded-2xl border border-line bg-white/70 p-4">
            Signed in as <span className="font-semibold text-foreground">{session.fullName}</span>.
          </div>
          {getStatusMessage(status) ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-800">
              {getStatusMessage(status)}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-2xl border border-accent-strong/20 bg-orange-50/80 p-4 text-accent-strong">
              {error}
            </div>
          ) : null}
          {invite ? (
            <div className="rounded-2xl border border-line bg-white/70 p-4">
              <p className="text-sm text-foreground">Local preview link</p>
              <Link
                href={invite}
                className="mt-2 block break-all text-sm font-semibold text-accent underline"
              >
                {invite}
              </Link>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <MemberCreateCard ships={ships} />
        <MemberDirectoryCard
          members={[...members].sort((left, right) => left.email.localeCompare(right.email))}
          ships={ships}
          currentUserId={session.userId}
        />
      </div>

      <AuditTrailCard entries={auditEntries} />
    </AppShell>
  );
}
