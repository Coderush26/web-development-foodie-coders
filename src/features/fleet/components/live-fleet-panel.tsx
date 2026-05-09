"use client";

import { useFleetStream } from "@/lib/realtime/use-fleet-stream";

type LiveFleetPanelProps = {
  title: string;
  description: string;
  shipId?: string;
};

function formatCoordinate(value: number) {
  return value.toFixed(2);
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString();
}

export function LiveFleetPanel({ title, description, shipId }: LiveFleetPanelProps) {
  const { snapshot, ship, connectionState, error } = useFleetStream(shipId);

  if (!snapshot) {
    return (
      <section className="rounded-3xl border border-line bg-surface p-6 shadow-lg shadow-slate-900/5">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
          Authoritative feed
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-muted">{description}</p>
        <p className="mt-6 text-sm leading-7 text-muted">Connecting to the live fleet runtime...</p>
      </section>
    );
  }

  const ships = ship ? [ship] : snapshot.ships.slice(0, 6);

  return (
    <section className="rounded-3xl border border-line bg-surface p-6 shadow-lg shadow-slate-900/5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
            Authoritative feed
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{description}</p>
        </div>
        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {connectionState}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-line bg-white/70 p-4">
          <p className="text-sm text-muted">Sequence</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{snapshot.sequence}</p>
        </div>
        <div className="rounded-2xl border border-line bg-white/70 p-4">
          <p className="text-sm text-muted">Watchers</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {snapshot.telemetry.viewerCount}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-white/70 p-4">
          <p className="text-sm text-muted">Moving ships</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {snapshot.telemetry.movingShips}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-white/70 p-4">
          <p className="text-sm text-muted">Last update</p>
          <p className="mt-2 text-lg font-semibold text-foreground">
            {formatTime(snapshot.generatedAt)}
          </p>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm leading-7 text-accent-strong">{error}</p> : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {ships.map((item) => (
          <div key={item.shipId} className="rounded-2xl border border-line bg-white/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
                  {item.shipId}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-foreground">{item.name}</h3>
              </div>
              <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                {item.status}
              </span>
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-muted">Position</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {formatCoordinate(item.position.lat)}, {formatCoordinate(item.position.lng)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-muted">Speed / heading</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {item.speedKnots} kn / {item.headingDegrees}&deg;
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-muted">Fuel</dt>
                <dd className="mt-1 text-sm text-foreground">{item.fuelTons.toFixed(2)} tons</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.2em] text-muted">
                  Distance to destination
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {item.distanceToDestinationKm.toFixed(2)} km
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
