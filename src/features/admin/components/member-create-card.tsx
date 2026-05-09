import { SectionCard } from "@/components/shell/section-card";
import type { AuthRole } from "@/server/auth/session";

type ShipOption = {
  shipId: string;
  name: string;
  cargo: string;
};

type MemberCreateCardProps = {
  ships: ShipOption[];
};

const roleOptions: { value: AuthRole; label: string }[] = [
  { value: "super_admin", label: "Super admin" },
  { value: "command", label: "Command" },
  { value: "captain", label: "Captain" },
];

export function MemberCreateCard({ ships }: MemberCreateCardProps) {
  return (
    <SectionCard
      title="Invite member"
      description="Create the member first, fix the role, and optionally bind the captain to a ship before the first sign-in."
    >
      <form action="/api/admin/members" method="post" className="grid gap-4">
        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-semibold uppercase tracking-[0.16em] text-muted">Full name</span>
          <input
            name="fullName"
            className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground"
          />
        </label>
        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-semibold uppercase tracking-[0.16em] text-muted">Email</span>
          <input
            name="email"
            type="email"
            className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground"
          />
        </label>
        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-semibold uppercase tracking-[0.16em] text-muted">Role</span>
          <select
            name="role"
            defaultValue="command"
            className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground"
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
            Captain ship assignment
          </span>
          <select
            name="captainShipId"
            defaultValue=""
            className="rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-foreground"
          >
            <option value="">No ship assignment</option>
            {ships.map((ship) => (
              <option key={ship.shipId} value={ship.shipId}>
                {ship.shipId} · {ship.name}
              </option>
            ))}
          </select>
        </label>
        <p className="rounded-2xl border border-line bg-white/70 p-4 text-sm leading-7 text-muted">
          Captain invites require a ship assignment. Command and super admin members can leave the
          ship field empty.
        </p>
        <button
          type="submit"
          className="action-button-light rounded-full border border-accent bg-accent px-4 py-3 text-sm font-semibold shadow-sm shadow-accent/20"
        >
          Create invitation
        </button>
      </form>
    </SectionCard>
  );
}
