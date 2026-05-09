import { getFleetScenarioSeed } from "@/features/fleet/data/scenario-seed";
import { haversineDistanceKm } from "@/lib/geo/navigation";
import { isPointInsidePolygon } from "@/lib/geo/polygon";
import type { GeoPoint } from "@/types/fleet";

const SEGMENT_SAMPLE_KM = 10;
const scenarioSeed = getFleetScenarioSeed();
const NAVIGATION_WAYPOINTS = [
  { id: "lane-west-0", point: { lat: 29.4, lng: 48.7 } },
  { id: "lane-gulf-1", point: { lat: 29.0, lng: 49.6 } },
  { id: "lane-gulf-2", point: { lat: 28.3, lng: 50.7 } },
  { id: "lane-gulf-3", point: { lat: 27.6, lng: 51.9 } },
  { id: "lane-gulf-4", point: { lat: 26.9, lng: 53.0 } },
  { id: "lane-north-1", point: { lat: 27.3, lng: 53.9 } },
  { id: "lane-north-2", point: { lat: 26.9, lng: 54.9 } },
  { id: "lane-south-1", point: { lat: 25.8, lng: 52.1 } },
  { id: "lane-south-2", point: { lat: 25.4, lng: 53.4 } },
  { id: "lane-south-3", point: { lat: 25.3, lng: 54.7 } },
  { id: "lane-strait-south-0", point: { lat: 25.45, lng: 55.55 } },
  { id: "lane-strait-south-1", point: { lat: 25.45, lng: 56.2 } },
  { id: "lane-strait-1", point: { lat: 26.3, lng: 55.4 } },
  { id: "lane-strait-2", point: { lat: 26.2, lng: 55.9 } },
  { id: "lane-strait-3", point: { lat: 26.1, lng: 56.25 } },
  { id: "lane-strait-4", point: { lat: 25.8, lng: 56.75 } },
  { id: "lane-oman-0", point: { lat: 24.8, lng: 57.1 } },
  { id: "lane-oman-1", point: { lat: 25.4, lng: 57.6 } },
  { id: "lane-oman-2", point: { lat: 24.9, lng: 58.25 } },
  { id: "lane-oman-3", point: { lat: 24.3, lng: 59.0 } },
  { id: "lane-oman-4", point: { lat: 24.0, lng: 58.55 } },
] as const;
const NAVIGATION_EDGES = [
  ["lane-west-0", "lane-gulf-1"],
  ["lane-gulf-1", "lane-gulf-2"],
  ["lane-gulf-2", "lane-gulf-3"],
  ["lane-gulf-3", "lane-gulf-4"],
  ["lane-gulf-3", "lane-north-1"],
  ["lane-north-1", "lane-north-2"],
  ["lane-north-2", "lane-strait-1"],
  ["lane-gulf-4", "lane-strait-1"],
  ["lane-gulf-4", "lane-south-1"],
  ["lane-south-1", "lane-south-2"],
  ["lane-south-2", "lane-south-3"],
  ["lane-south-3", "lane-strait-south-0"],
  ["lane-strait-south-0", "lane-strait-south-1"],
  ["lane-strait-south-1", "lane-strait-4"],
  ["lane-south-3", "lane-strait-2"],
  ["lane-south-2", "lane-strait-1"],
  ["lane-strait-1", "lane-strait-2"],
  ["lane-strait-2", "lane-strait-3"],
  ["lane-strait-3", "lane-strait-4"],
  ["lane-strait-4", "lane-oman-0"],
  ["lane-oman-0", "lane-oman-4"],
  ["lane-strait-4", "lane-oman-1"],
  ["lane-oman-1", "lane-oman-2"],
  ["lane-oman-2", "lane-oman-3"],
  ["lane-oman-0", "lane-oman-1"],
] as const;

export interface NavigationNode {
  id: string;
  point: GeoPoint;
  neighborIds: string[];
}

type NavigationGrid = {
  nodes: NavigationNode[];
  nodeById: Map<string, NavigationNode>;
};

let navigationGrid: NavigationGrid | null = null;

function interpolatePoint(start: GeoPoint, end: GeoPoint, progress: number): GeoPoint {
  return {
    lat: start.lat + (end.lat - start.lat) * progress,
    lng: start.lng + (end.lng - start.lng) * progress,
  };
}

export function isPointInsideNavigableWater(point: GeoPoint) {
  return isPointInsidePolygon(point, scenarioSeed.navigableWater);
}

export function isSegmentInsideNavigableWater(start: GeoPoint, end: GeoPoint) {
  const sampleCount = Math.max(1, Math.ceil(haversineDistanceKm(start, end) / SEGMENT_SAMPLE_KM));

  for (let index = 0; index <= sampleCount; index += 1) {
    const point = interpolatePoint(start, end, index / sampleCount);

    if (!isPointInsideNavigableWater(point)) {
      return false;
    }
  }

  return true;
}

function createNodes() {
  return NAVIGATION_WAYPOINTS.map<NavigationNode>(({ id, point }) => ({
    id,
    point,
    neighborIds: [],
  }));
}

function buildNavigationGrid() {
  const nodes = createNodes();
  const nodeById = new Map(nodes.map((node) => [node.id, node] as const));

  for (const [leftId, rightId] of NAVIGATION_EDGES) {
    const left = nodeById.get(leftId);
    const right = nodeById.get(rightId);

    if (!left || !right) {
      continue;
    }

    left.neighborIds.push(right.id);
    right.neighborIds.push(left.id);
  }

  return {
    nodes,
    nodeById,
  };
}

export function getNavigationGrid() {
  navigationGrid ??= buildNavigationGrid();
  return navigationGrid;
}
