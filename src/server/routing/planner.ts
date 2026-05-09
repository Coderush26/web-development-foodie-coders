import { haversineDistanceKm } from "@/lib/geo/navigation";
import { doesSegmentIntersectPolygon, isPointInsidePolygon } from "@/lib/geo/polygon";
import {
  getWeatherCellForPoint,
  getWeatherFuelMultiplier,
  getWeatherRouteCostMultiplier,
} from "@/lib/weather/open-meteo";
import { KM_PER_NAUTICAL_MILE } from "@/server/simulation/constants";
import {
  getNavigationGrid,
  isPointInsideNavigableWater,
  isSegmentInsideNavigableWater,
} from "@/server/routing/grid";
import type { GeoPoint, ShipIntentType } from "@/types/fleet";
import type { ShipRoutePlan } from "@/types/routing";
import type { WeatherSnapshot } from "@/types/weather";
import type { RestrictedZone } from "@/types/zones";

const CONNECTOR_DISTANCE_KM = 140;
const CONNECTOR_LIMIT = 14;
const DIRECT_ROUTE_MAX_DISTANCE_KM = 120;
const FALLBACK_CRUISE_SPEED_KNOTS = 12;
const FINAL_POINT_TOLERANCE_KM = 1.2;

type PlanRouteInput = {
  generatedAt: string;
  start: GeoPoint;
  target: GeoPoint;
  targetIntentType: ShipIntentType;
  speedKnots: number;
  fuelBurnRateTonsPerHour: number;
  fuelTons: number;
  zones: RestrictedZone[];
  weather: WeatherSnapshot | null;
};

function isPointBlockedByZones(point: GeoPoint, zones: RestrictedZone[]) {
  return zones.some((zone) => isPointInsidePolygon(point, zone.points));
}

function getStartContainingZones(start: GeoPoint, zones: RestrictedZone[]) {
  return zones.filter((zone) => isPointInsidePolygon(start, zone.points));
}

function isSegmentBlockedByZones(
  start: GeoPoint,
  end: GeoPoint,
  zones: RestrictedZone[],
  allowStartInsideZone = false
) {
  const ignoredZoneIds = allowStartInsideZone
    ? new Set(getStartContainingZones(start, zones).map((zone) => zone.id))
    : new Set<string>();

  return zones.some((zone) => {
    if (ignoredZoneIds.has(zone.id)) {
      return false;
    }

    return doesSegmentIntersectPolygon(start, end, zone.points);
  });
}

function isTraversableSegment(
  start: GeoPoint,
  end: GeoPoint,
  zones: RestrictedZone[],
  allowStartInsideZone = false,
  requireWaterCheck = false
) {
  return (
    (!requireWaterCheck || isSegmentInsideNavigableWater(start, end)) &&
    !isSegmentBlockedByZones(start, end, zones, allowStartInsideZone)
  );
}

function getSegmentMidpoint(start: GeoPoint, end: GeoPoint): GeoPoint {
  return {
    lat: (start.lat + end.lat) / 2,
    lng: (start.lng + end.lng) / 2,
  };
}

function getSegmentRouteCost(start: GeoPoint, end: GeoPoint, weather: WeatherSnapshot | null) {
  const severity =
    getWeatherCellForPoint(getSegmentMidpoint(start, end), weather)?.severity ?? "clear";
  return haversineDistanceKm(start, end) * getWeatherRouteCostMultiplier(severity);
}

function getCandidateNodeIds(
  point: GeoPoint,
  zones: RestrictedZone[],
  allowStartInsideZone = false
) {
  return getNavigationGrid()
    .nodes.filter(
      (node) =>
        haversineDistanceKm(point, node.point) <= CONNECTOR_DISTANCE_KM &&
        !isPointBlockedByZones(node.point, zones) &&
        isTraversableSegment(point, node.point, zones, allowStartInsideZone)
    )
    .sort(
      (left, right) =>
        haversineDistanceKm(point, left.point) - haversineDistanceKm(point, right.point)
    )
    .slice(0, CONNECTOR_LIMIT)
    .map((node) => node.id);
}

function compressRoutePoints(start: GeoPoint, points: GeoPoint[], zones: RestrictedZone[]) {
  void start;
  void zones;
  return points;
}

function getPathDistanceKm(start: GeoPoint, points: GeoPoint[]) {
  let distanceKm = 0;
  let currentPoint = start;

  for (const point of points) {
    distanceKm += haversineDistanceKm(currentPoint, point);
    currentPoint = point;
  }

  return distanceKm;
}

function estimateFuelRequiredTons(
  start: GeoPoint,
  points: GeoPoint[],
  speedKnots: number,
  fuelBurnRateTonsPerHour: number,
  weather: WeatherSnapshot | null
) {
  let estimatedFuelRequiredTons = 0;
  let currentPoint = start;
  const effectiveSpeedKnots = Math.max(speedKnots, FALLBACK_CRUISE_SPEED_KNOTS);

  for (const point of points) {
    const segmentDistanceKm = haversineDistanceKm(currentPoint, point);
    const segmentHours = segmentDistanceKm / (effectiveSpeedKnots * KM_PER_NAUTICAL_MILE);
    const severity =
      getWeatherCellForPoint(getSegmentMidpoint(currentPoint, point), weather)?.severity ?? "clear";

    estimatedFuelRequiredTons +=
      fuelBurnRateTonsPerHour * segmentHours * getWeatherFuelMultiplier(severity);
    currentPoint = point;
  }

  return estimatedFuelRequiredTons;
}

function reconstructPath(cameFrom: Map<string, string>, currentId: string) {
  const nodeIds = [currentId];

  while (cameFrom.has(currentId)) {
    currentId = cameFrom.get(currentId) ?? currentId;
    nodeIds.unshift(currentId);
  }

  return nodeIds;
}

function createBlockedRoutePlan(input: PlanRouteInput): ShipRoutePlan {
  return {
    status: "blocked",
    targetIntentType: input.targetIntentType,
    points: [],
    totalDistanceKm: 0,
    directDistanceKm: haversineDistanceKm(input.start, input.target),
    estimatedFuelRequiredTons: 0,
    fuelFeasible: true,
    recomputedAt: input.generatedAt,
    reason: "blocked",
  };
}

export function planRoute(input: PlanRouteInput): ShipRoutePlan {
  const startInsideZone = isPointBlockedByZones(input.start, input.zones);
  const canSailDirect =
    haversineDistanceKm(input.start, input.target) <= DIRECT_ROUTE_MAX_DISTANCE_KM &&
    isTraversableSegment(input.start, input.target, input.zones, startInsideZone, true);

  if (
    !isPointInsideNavigableWater(input.start) ||
    !isPointInsideNavigableWater(input.target) ||
    isPointBlockedByZones(input.target, input.zones)
  ) {
    return createBlockedRoutePlan(input);
  }

  const startNeighborIds = new Set(getCandidateNodeIds(input.start, input.zones, startInsideZone));
  const targetNeighborIds = new Set(getCandidateNodeIds(input.target, input.zones));

  if (canSailDirect) {
    startNeighborIds.add("target");
  }

  if (startNeighborIds.size === 0 || (!canSailDirect && targetNeighborIds.size === 0)) {
    return createBlockedRoutePlan(input);
  }

  const grid = getNavigationGrid();
  const blockedNodeIds = new Set(
    grid.nodes
      .filter((node) => isPointBlockedByZones(node.point, input.zones))
      .map((node) => node.id)
  );
  const openNodeIds = new Set<string>(["start"]);
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>([["start", 0]]);
  const fScore = new Map<string, number>([
    ["start", haversineDistanceKm(input.start, input.target)],
  ]);

  const getPointById = (nodeId: string) => {
    if (nodeId === "start") {
      return input.start;
    }

    if (nodeId === "target") {
      return input.target;
    }

    return grid.nodeById.get(nodeId)?.point ?? input.target;
  };

  const getNeighborIds = (nodeId: string) => {
    if (nodeId === "start") {
      return [...startNeighborIds];
    }

    if (nodeId === "target") {
      return [];
    }

    if (blockedNodeIds.has(nodeId)) {
      return [];
    }

    const node = grid.nodeById.get(nodeId);

    if (!node) {
      return [];
    }

    const neighborIds = node.neighborIds.filter((neighborId) => {
      if (blockedNodeIds.has(neighborId)) {
        return false;
      }

      const neighbor = grid.nodeById.get(neighborId);
      return neighbor ? isTraversableSegment(node.point, neighbor.point, input.zones) : false;
    });

    if (
      targetNeighborIds.has(nodeId) &&
      isTraversableSegment(node.point, input.target, input.zones)
    ) {
      neighborIds.push("target");
    }

    return neighborIds;
  };

  while (openNodeIds.size > 0) {
    const currentId = [...openNodeIds].sort(
      (left, right) =>
        (fScore.get(left) ?? Number.POSITIVE_INFINITY) -
        (fScore.get(right) ?? Number.POSITIVE_INFINITY)
    )[0];

    if (currentId === "target") {
      const nodeIds = reconstructPath(cameFrom, currentId);
      const rawPoints = nodeIds.slice(1).map((nodeId) => getPointById(nodeId));
      const points = compressRoutePoints(input.start, rawPoints, input.zones);
      const totalDistanceKm = getPathDistanceKm(input.start, points);
      const estimatedFuelRequiredTons = estimateFuelRequiredTons(
        input.start,
        points,
        input.speedKnots,
        input.fuelBurnRateTonsPerHour,
        input.weather
      );
      const finalPoint = points.at(-1) ?? input.target;
      const isDirectRoute =
        canSailDirect &&
        points.length === 1 &&
        haversineDistanceKm(finalPoint, input.target) <= FINAL_POINT_TOLERANCE_KM;
      const reason = isDirectRoute
        ? input.targetIntentType === "waypoint"
          ? "directive"
          : "initial"
        : input.zones.length > 0
          ? "zone"
          : input.targetIntentType === "waypoint"
            ? "directive"
            : "initial";

      return {
        status: reason === "zone" ? "rerouting" : "direct",
        targetIntentType: input.targetIntentType,
        points,
        totalDistanceKm,
        directDistanceKm: haversineDistanceKm(input.start, input.target),
        estimatedFuelRequiredTons,
        fuelFeasible: estimatedFuelRequiredTons <= input.fuelTons,
        recomputedAt: input.generatedAt,
        reason,
      };
    }

    openNodeIds.delete(currentId);

    for (const neighborId of getNeighborIds(currentId)) {
      const tentativeScore =
        (gScore.get(currentId) ?? Number.POSITIVE_INFINITY) +
        getSegmentRouteCost(getPointById(currentId), getPointById(neighborId), input.weather);

      if (tentativeScore >= (gScore.get(neighborId) ?? Number.POSITIVE_INFINITY)) {
        continue;
      }

      cameFrom.set(neighborId, currentId);
      gScore.set(neighborId, tentativeScore);
      fScore.set(
        neighborId,
        tentativeScore + haversineDistanceKm(getPointById(neighborId), input.target)
      );
      openNodeIds.add(neighborId);
    }
  }

  return createBlockedRoutePlan(input);
}
