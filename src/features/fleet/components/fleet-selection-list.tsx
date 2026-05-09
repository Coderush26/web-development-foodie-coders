import { SectionCard } from "@/components/shell/section-card";
import { getPortById } from "@/features/fleet/data/scenario-seed";
import type { FleetDisplayShip } from "@/features/fleet/hooks/use-interpolated-fleet-view";

type FleetSelectionListProps = {
  ships: FleetDisplayShip[];
  selectedShipId: string | null;
  onSelectShip: (shipId: string) => void;
};

export function FleetSelectionList({
  ships,
  selectedShipId,
  onSelectShip,
}: FleetSelectionListProps) {
  const orderedShips = [...ships].sort((left, right) => {
    if (left.shipId === selectedShipId) {
      return -1;
    }

    if (right.shipId === selectedShipId) {
      return 1;
    }

    return left.shipId.localeCompare(right.shipId);
  });

  return (
    <SectionCard
      title="Fleet roster"
      description="Tap any ship to refocus the details pane and center the command view on that vessel."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {orderedShips.map((ship) => {
          const destination = getPortById(ship.destinationPortId);
          const isSelected = ship.shipId === selectedShipId;

          return (
            <button
              key={ship.shipId}
              type="button"
              onClick={() => onSelectShip(ship.shipId)}
              aria-pressed={isSelected}
              className={`rounded-2xl border p-4 text-left transition-transform hover:-translate-y-0.5 ${
                isSelected
                  ? "border-accent/30 bg-emerald-50/80"
                  : "border-line bg-white/70 hover:border-accent/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">
                    {ship.shipId}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{ship.name}</p>
                </div>
                <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  {ship.status}
                </span>
              </div>

              <dl className="mt-3 grid gap-3 text-sm text-muted sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em]">Destination</dt>
                  <dd className="mt-1 text-foreground">
                    {destination?.name ?? ship.destinationPortId}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-[0.2em]">Fuel</dt>
                  <dd className="mt-1 text-foreground">{ship.fuelTons.toFixed(1)} tons</dd>
                </div>
              </dl>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}
