import { SectionCard } from "@/components/shell/section-card";
import type { AdminMemberRecord } from "@/server/auth/members";
import type { AuthRole } from "@/server/auth/session";

type ShipOption = {
  shipId: string;
  name: string;
  cargo: string;
};

type MemberDirectoryCardProps = {
  members: AdminMemberRecord[];
  ships: ShipOption[];
  currentUserId: string;
};

const roleOptions: { value: AuthRole; label: string }[] = [
  { value: "super_admin", label: "Super admin" },
  { value: "command", label: "Command" },
  { value: "captain", label: "Captain" },
];

export function MemberDirectoryCard({ members, ships, currentUserId }: MemberDirectoryCardProps) {
  return (
    <SectionCard
      title="Member directory"
      description="Update role access, captain ship assignment, activation state, or resend onboarding links from one place."
    >
      <div className="grid gap-4">
        {members.map((member) => {
          const primaryRole = member.roles[0] ?? "command";
          const currentShipId = member.captainShipIds[0] ?? "";
          const isCurrentUser = member.userId === currentUserId;

          return (
            <article
              key={member.userId}
              className="rounded-3xl border border-line bg-white/75 p-5 shadow-sm shadow-slate-900/5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">{member.fullName}</p>
                  <p className="mt-1 text-sm text-muted">{member.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {primaryRole}
                  </span>
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {member.status}
                  </span>
                  <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    {member.emailVerifiedAt ? "verified" : "unverified"}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm leading-7 text-muted">
                Ship assignment: {currentShipId || "none"}. Added{" "}
                {new Date(member.createdAt).toLocaleDateString()}.
              </p>

              <form
                action={`/api/admin/members/${member.userId}`}
                method="post"
                className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]"
              >
                <input type="hidden" name="intent" value="update-access" />
                <label className="grid gap-2 text-sm text-foreground">
                  <span className="font-semibold uppercase tracking-[0.16em] text-muted">Role</span>
                  <select
                    name="role"
                    defaultValue={primaryRole}
                    disabled={isCurrentUser}
                    className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground disabled:opacity-60"
                  >
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm text-foreground">
                  <span className="font-semibold uppercase tracking-[0.16em] text-muted">
                    Captain ship
                  </span>
                  <select
                    name="captainShipId"
                    defaultValue={currentShipId}
                    disabled={isCurrentUser}
                    className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground disabled:opacity-60"
                  >
                    <option value="">No ship assignment</option>
                    {ships.map((ship) => (
                      <option key={ship.shipId} value={ship.shipId}>
                        {ship.shipId} · {ship.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={isCurrentUser}
                  className="action-button-light self-end rounded-full border border-accent bg-accent px-4 py-3 text-sm font-semibold shadow-sm shadow-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save access
                </button>
              </form>

              <div className="mt-4 flex flex-wrap gap-3">
                <form action={`/api/admin/members/${member.userId}`} method="post">
                  <input type="hidden" name="intent" value="toggle-status" />
                  <button
                    type="submit"
                    disabled={isCurrentUser}
                    className="action-button-light rounded-full border border-accent-strong bg-accent-strong px-4 py-2 text-sm font-semibold shadow-sm shadow-orange-900/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {member.status === "disabled" ? "Reactivate member" : "Disable member"}
                  </button>
                </form>
                {!member.emailVerifiedAt ? (
                  <form action={`/api/admin/members/${member.userId}`} method="post">
                    <input type="hidden" name="intent" value="resend-invite" />
                    <button
                      type="submit"
                      className="action-button-light rounded-full border border-foreground bg-foreground px-4 py-2 text-sm font-semibold shadow-sm shadow-slate-900/10"
                    >
                      Resend invite
                    </button>
                  </form>
                ) : null}
                {isCurrentUser ? (
                  <p className="self-center text-xs uppercase tracking-[0.18em] text-muted">
                    Self-role and self-disable are blocked.
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </SectionCard>
  );
}
