import { getFleetScenarioSeed } from "@/features/fleet/data/scenario-seed";
import {
  buildFallbackWeatherSnapshot,
  fetchOpenMeteoWeatherSnapshot,
} from "@/lib/weather/open-meteo";
import type { WeatherSnapshot } from "@/types/weather";

const WEATHER_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const scenarioSeed = getFleetScenarioSeed();

export class FleetWeatherService {
  private snapshot: WeatherSnapshot = buildFallbackWeatherSnapshot(
    scenarioSeed.bounds,
    scenarioSeed.navigableWater
  );

  private lastRefreshMs = Date.now();
  private refreshPromise: Promise<void> | null = null;

  getSnapshot(now = new Date()) {
    if (now.getTime() - this.lastRefreshMs >= WEATHER_REFRESH_INTERVAL_MS) {
      void this.refresh(now);
    }

    return this.snapshot;
  }

  prime() {
    void this.refresh(new Date());
  }

  private async refresh(now: Date) {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = fetchOpenMeteoWeatherSnapshot(
      scenarioSeed.bounds,
      scenarioSeed.navigableWater,
      now
    )
      .then((snapshot) => {
        this.snapshot = snapshot;
        this.lastRefreshMs = now.getTime();
      })
      .catch(() => {
        if (this.snapshot.provider === "fallback") {
          this.snapshot = buildFallbackWeatherSnapshot(
            scenarioSeed.bounds,
            scenarioSeed.navigableWater,
            now
          );
        }

        this.lastRefreshMs = now.getTime();
      })
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }
}
