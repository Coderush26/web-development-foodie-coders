export const SIMULATION_TICK_MS = 1000;
export const SIMULATION_TICK_RATE_HZ = 1000 / SIMULATION_TICK_MS;
export const ARRIVAL_RADIUS_KM = 3;
export const KM_PER_NAUTICAL_MILE = 1.852;

// Assumption for Phase 2: baseline fuel burn grows linearly with speed.
export const BASE_FUEL_BURN_TONS_PER_HOUR = 2.4;
export const FUEL_BURN_TONS_PER_HOUR_PER_KNOT = 0.28;
