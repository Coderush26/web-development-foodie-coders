import Link from "next/link";

type ShipPreview = {
  shipId: string;
  name: string;
  cargo: string;
  status: string;
  destinationName: string;
  href: string;
};

type ShipRosterPreviewProps = {
  ships: ShipPreview[];
};

export function ShipRosterPreview({ ships }: ShipRosterPreviewProps) {
  return (
    <section className="rounded-4xl border border-line bg-surface p-6 shadow-lg shadow-slate-900/5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
            Captain access
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Bridge consoles
          </h2>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          ship-scoped dashboards
        </span>
      </div>

      <p className="mt-4 text-sm leading-7 text-muted">
        Open any of these captain routes to view a live ship-scoped console with directives, alerts,
        route status, and nearby traffic context.
      </p>

      <div className="mt-5 grid gap-3">
        {ships.map((ship) => (
          <Link
            key={ship.shipId}
            href={ship.href}
            className="rounded-2xl border border-line bg-white/70 p-4 transition-transform hover:-translate-y-0.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
                  {ship.shipId}
                </p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">{ship.name}</h3>
                <p className="mt-1 text-sm text-muted">{ship.destinationName}</p>
              </div>
              <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {ship.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-muted">Cargo manifest: {ship.cargo}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
