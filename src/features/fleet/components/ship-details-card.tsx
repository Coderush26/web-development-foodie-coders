import { SectionCard } from "@/components/shell/section-card";
import { getPortById } from "@/features/fleet/data/scenario-seed";
import type { FleetDisplayShip } from "@/features/fleet/hooks/use-interpolated-fleet-view";
import type { ShipStatus } from "@/types/fleet";

type ShipDetailsCardProps = {
  ship: FleetDisplayShip | null;
  roleLabel: "Command" | "Captain";
};

const warningStatuses = new Set<ShipStatus>(["distressed", "stranded", "out-of-fuel"]);
const accentStatuses = new Set<ShipStatus>(["rerouting", "insufficient-fuel"]);

function resolveTone(status: ShipStatus | undefined) {
  if (!status) {
    return "default" as const;
  }

  if (warningStatuses.has(status)) {
    return "warning" as const;
  }

  if (accentStatuses.has(status)) {
    return "accent" as const;
  }

  return "default" as const;
}

function formatCoordinate(value: number) {
  return value.toFixed(3);
}

function formatRouteReason(value: string) {
  return value.replace(/-/g, " ");
}

export function ShipDetailsCard({ ship, roleLabel }: ShipDetailsCardProps) {
  if (!ship) {
    return (
      <SectionCard
        title="Ship details"
        description="Choose a vessel on the map or from the live roster to inspect its operational state."
      >
        <p className="text-sm leading-7 text-muted">
          {roleLabel} does not have an active ship selection yet.
        </p>
      </SectionCard>
    );
  }

  const destination = getPortById(ship.destinationPortId);

  return (
    <SectionCard
      title={`${ship.name} details`}
      description={`${roleLabel} is reading the current interpolated presentation of the authoritative runtime state.`}
      tone={resolveTone(ship.status)}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">{ship.shipId}</p>
          <p className="mt-2 text-sm leading-7 text-muted">{ship.cargo}</p>
        </div>
        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {ship.status}
        </span>
      </div>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-muted">Destination</dt>
          <dd className="mt-1 text-sm text-foreground">
            {destination?.name ?? ship.destinationPortId}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-muted">Fuel remaining</dt>
          <dd className="mt-1 text-sm text-foreground">{ship.fuelTons.toFixed(2)} tons</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-muted">Speed / heading</dt>
          <dd className="mt-1 text-sm text-foreground">
            {ship.speedKnots.toFixed(1)} kn / {ship.headingDegrees.toFixed(0)}&deg;
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-muted">Fuel burn</dt>
          <dd className="mt-1 text-sm text-foreground">
            {ship.fuelBurnRateTonsPerHour.toFixed(2)} tons/hour
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-muted">Interpolated position</dt>
          <dd className="mt-1 text-sm text-foreground">
            {formatCoordinate(ship.displayPosition.lat)},{" "}
            {formatCoordinate(ship.displayPosition.lng)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-muted">Distance remaining</dt>
          <dd className="mt-1 text-sm text-foreground">
            {ship.distanceToDestinationKm.toFixed(2)} km
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-muted">Route status</dt>
          <dd className="mt-1 text-sm text-foreground">
            {ship.routePlan.status} · {formatRouteReason(ship.routePlan.reason)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-muted">Route path</dt>
          <dd className="mt-1 text-sm text-foreground">
            {ship.routePlan.points.length} waypoints · {ship.routePlan.totalDistanceKm.toFixed(1)}{" "}
            km
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-muted">Fuel forecast</dt>
          <dd className="mt-1 text-sm text-foreground">
            {ship.routePlan.estimatedFuelRequiredTons.toFixed(1)} tons ·{" "}
            {ship.routePlan.fuelFeasible ? "feasible" : "shortfall"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-muted">Current weather</dt>
          <dd className="mt-1 text-sm text-foreground">
            {ship.weatherState.severity} · {ship.weatherState.windSpeedKnots.toFixed(1)} kn ·{" "}
            {ship.weatherState.waveHeightMeters.toFixed(1)} m
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-muted">Intent</dt>
          <dd className="mt-1 text-sm text-foreground">{ship.intent.type}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.2em] text-muted">Last server tick</dt>
          <dd className="mt-1 text-sm text-foreground">
            {new Date(ship.lastUpdatedAt).toLocaleTimeString()}
          </dd>
        </div>
      </dl>
    </SectionCard>
  );
}
