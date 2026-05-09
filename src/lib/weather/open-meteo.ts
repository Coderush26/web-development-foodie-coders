import { isPointInsidePolygon } from "@/lib/geo/polygon";
import type { BoundingBox, GeoPoint } from "@/types/fleet";
import type { WeatherCell, WeatherSeverity, WeatherSnapshot } from "@/types/weather";

const SAMPLE_ROWS = 4;
const SAMPLE_COLUMNS = 4;
const REQUEST_TIMEOUT_MS = 5_000;

type WindResponse = {
  current?: {
    time?: string;
    wind_speed_10m?: number;
  };
};

type WaveResponse = {
  current?: {
    time?: string;
    wave_height?: number;
  };
};

function roundWeatherValue(value: number) {
  return Number(value.toFixed(1));
}

function buildWindUrl(point: GeoPoint) {
  const search = new URLSearchParams({
    latitude: point.lat.toFixed(4),
    longitude: point.lng.toFixed(4),
    current: "wind_speed_10m",
    wind_speed_unit: "kn",
    forecast_hours: "1",
    cell_selection: "sea",
    timezone: "GMT",
  });

  return `https://api.open-meteo.com/v1/forecast?${search.toString()}`;
}

function buildWaveUrl(point: GeoPoint) {
  const search = new URLSearchParams({
    latitude: point.lat.toFixed(4),
    longitude: point.lng.toFixed(4),
    current: "wave_height",
    forecast_hours: "1",
    cell_selection: "sea",
    timezone: "GMT",
  });

  return `https://marine-api.open-meteo.com/v1/marine?${search.toString()}`;
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

function createSamplingPoints(bounds: BoundingBox, navigableWater: GeoPoint[]) {
  const points: GeoPoint[] = [];

  for (let row = 0; row < SAMPLE_ROWS; row += 1) {
    for (let column = 0; column < SAMPLE_COLUMNS; column += 1) {
      const latFraction = (row + 1) / (SAMPLE_ROWS + 1);
      const lngFraction = (column + 1) / (SAMPLE_COLUMNS + 1);
      const point = {
        lat: bounds.south + (bounds.north - bounds.south) * latFraction,
        lng: bounds.west + (bounds.east - bounds.west) * lngFraction,
      };

      if (isPointInsidePolygon(point, navigableWater)) {
        points.push(point);
      }
    }
  }

  if (points.length > 0) {
    return points;
  }

  return [
    {
      lat: (bounds.north + bounds.south) / 2,
      lng: (bounds.east + bounds.west) / 2,
    },
  ];
}

export function classifyWeatherSeverity(
  windSpeedKnots: number,
  waveHeightMeters: number
): WeatherSeverity {
  if (windSpeedKnots >= 28 || waveHeightMeters >= 2.5) {
    return "adverse";
  }

  if (windSpeedKnots >= 18 || waveHeightMeters >= 1.5) {
    return "watch";
  }

  return "clear";
}

function deriveWaveHeightMeters(windSpeedKnots: number) {
  return roundWeatherValue(Math.max(0.4, windSpeedKnots * 0.08));
}

function buildWeatherCell(
  id: string,
  center: GeoPoint,
  windSpeedKnots: number,
  waveHeightMeters: number,
  sampledAt: string
): WeatherCell {
  return {
    id,
    center,
    windSpeedKnots: roundWeatherValue(windSpeedKnots),
    waveHeightMeters: roundWeatherValue(waveHeightMeters),
    severity: classifyWeatherSeverity(windSpeedKnots, waveHeightMeters),
    sampledAt,
  };
}

function createFallbackSignal(point: GeoPoint, now: Date) {
  const hour = now.getUTCHours() + now.getUTCMinutes() / 60;
  const phase = Math.sin(point.lat * 0.7 + hour * 0.65) + Math.cos(point.lng * 0.45 - hour * 0.35);

  return (phase + 2) / 4;
}

export function buildFallbackWeatherSnapshot(
  bounds: BoundingBox,
  navigableWater: GeoPoint[],
  now = new Date()
): WeatherSnapshot {
  const sampledAt = now.toISOString();
  const cells = createSamplingPoints(bounds, navigableWater).map((point, index) => {
    const signal = createFallbackSignal(point, now);
    const windSpeedKnots = 10 + signal * 22;
    const waveHeightMeters = 0.6 + signal * 2.1;

    return buildWeatherCell(
      `weather-fallback-${index}`,
      point,
      windSpeedKnots,
      waveHeightMeters,
      sampledAt
    );
  });

  return {
    provider: "fallback",
    sampledAt,
    usingFallback: true,
    cells,
  };
}

async function fetchWeatherCell(point: GeoPoint, index: number, fallbackCell: WeatherCell) {
  const [windResult, waveResult] = await Promise.allSettled([
    fetchJson<WindResponse>(buildWindUrl(point)),
    fetchJson<WaveResponse>(buildWaveUrl(point)),
  ]);

  const windSpeedKnots =
    windResult.status === "fulfilled" &&
    typeof windResult.value.current?.wind_speed_10m === "number"
      ? windResult.value.current.wind_speed_10m
      : fallbackCell.windSpeedKnots;
  const sampledAt =
    (windResult.status === "fulfilled" && windResult.value.current?.time) ||
    (waveResult.status === "fulfilled" && waveResult.value.current?.time) ||
    fallbackCell.sampledAt;
  const waveHeightMeters =
    waveResult.status === "fulfilled" && typeof waveResult.value.current?.wave_height === "number"
      ? waveResult.value.current.wave_height
      : deriveWaveHeightMeters(windSpeedKnots);

  return {
    cell: buildWeatherCell(
      `weather-open-meteo-${index}`,
      point,
      windSpeedKnots,
      waveHeightMeters,
      sampledAt
    ),
    usedFallback:
      windResult.status !== "fulfilled" ||
      waveResult.status !== "fulfilled" ||
      typeof waveResult.value.current?.wave_height !== "number",
    usedLiveWind:
      windResult.status === "fulfilled" &&
      typeof windResult.value.current?.wind_speed_10m === "number",
  };
}

export async function fetchOpenMeteoWeatherSnapshot(
  bounds: BoundingBox,
  navigableWater: GeoPoint[],
  now = new Date()
): Promise<WeatherSnapshot> {
  const fallbackSnapshot = buildFallbackWeatherSnapshot(bounds, navigableWater, now);
  const results = await Promise.allSettled(
    fallbackSnapshot.cells.map((fallbackCell, index) =>
      fetchWeatherCell(fallbackCell.center, index, fallbackCell)
    )
  );

  let hasLiveWindSample = false;
  const cells = results.map((result, index) => {
    if (result.status === "fulfilled") {
      hasLiveWindSample ||= result.value.usedLiveWind;
      return result.value.cell;
    }

    return fallbackSnapshot.cells[index];
  });

  if (!hasLiveWindSample) {
    throw new Error("Open-Meteo did not return any live wind samples.");
  }

  return {
    provider: "open-meteo",
    sampledAt: now.toISOString(),
    usingFallback: results.some(
      (result) => result.status === "rejected" || result.value.usedFallback
    ),
    cells,
  };
}

function severityRank(severity: WeatherSeverity) {
  if (severity === "adverse") {
    return 2;
  }

  if (severity === "watch") {
    return 1;
  }

  return 0;
}

export function compareWeatherSeverity(left: WeatherSeverity, right: WeatherSeverity) {
  return severityRank(left) - severityRank(right);
}

export function getWeatherFuelMultiplier(severity: WeatherSeverity) {
  return severity === "adverse" ? 1.3 : 1;
}

export function getWeatherRouteCostMultiplier(severity: WeatherSeverity) {
  if (severity === "adverse") {
    return 4.5;
  }

  if (severity === "watch") {
    return 1.8;
  }

  return 1;
}

export function getWeatherCellForPoint(point: GeoPoint, snapshot: WeatherSnapshot | null) {
  if (!snapshot || snapshot.cells.length === 0) {
    return null;
  }

  return snapshot.cells.reduce<WeatherCell | null>((closestCell, cell) => {
    if (!closestCell) {
      return cell;
    }

    const currentDistance = Math.hypot(point.lat - cell.center.lat, point.lng - cell.center.lng);
    const closestDistance = Math.hypot(
      point.lat - closestCell.center.lat,
      point.lng - closestCell.center.lng
    );

    return currentDistance < closestDistance ? cell : closestCell;
  }, null);
}
