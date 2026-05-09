import {
  BASE_FUEL_BURN_TONS_PER_HOUR,
  FUEL_BURN_TONS_PER_HOUR_PER_KNOT,
} from "@/server/simulation/constants";

export function getFuelBurnRateTonsPerHour(speedKnots: number, fuelMultiplier = 1) {
  return (
    (BASE_FUEL_BURN_TONS_PER_HOUR + speedKnots * FUEL_BURN_TONS_PER_HOUR_PER_KNOT) * fuelMultiplier
  );
}
