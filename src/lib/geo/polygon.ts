import type { GeoPoint } from "@/types/fleet";

const EPSILON = 1e-9;

function isPointOnSegment(point: GeoPoint, start: GeoPoint, end: GeoPoint) {
  const crossProduct =
    (point.lat - start.lat) * (end.lng - start.lng) -
    (point.lng - start.lng) * (end.lat - start.lat);

  if (Math.abs(crossProduct) > EPSILON) {
    return false;
  }

  const minLat = Math.min(start.lat, end.lat) - EPSILON;
  const maxLat = Math.max(start.lat, end.lat) + EPSILON;
  const minLng = Math.min(start.lng, end.lng) - EPSILON;
  const maxLng = Math.max(start.lng, end.lng) + EPSILON;

  return point.lat >= minLat && point.lat <= maxLat && point.lng >= minLng && point.lng <= maxLng;
}

function getOrientation(first: GeoPoint, second: GeoPoint, third: GeoPoint) {
  const determinant =
    (second.lng - first.lng) * (third.lat - first.lat) -
    (second.lat - first.lat) * (third.lng - first.lng);

  if (Math.abs(determinant) <= EPSILON) {
    return 0;
  }

  return determinant > 0 ? 1 : -1;
}

function doSegmentsIntersect(
  firstStart: GeoPoint,
  firstEnd: GeoPoint,
  secondStart: GeoPoint,
  secondEnd: GeoPoint
) {
  const orientationA = getOrientation(firstStart, firstEnd, secondStart);
  const orientationB = getOrientation(firstStart, firstEnd, secondEnd);
  const orientationC = getOrientation(secondStart, secondEnd, firstStart);
  const orientationD = getOrientation(secondStart, secondEnd, firstEnd);

  if (orientationA !== orientationB && orientationC !== orientationD) {
    return true;
  }

  if (orientationA === 0 && isPointOnSegment(secondStart, firstStart, firstEnd)) {
    return true;
  }

  if (orientationB === 0 && isPointOnSegment(secondEnd, firstStart, firstEnd)) {
    return true;
  }

  if (orientationC === 0 && isPointOnSegment(firstStart, secondStart, secondEnd)) {
    return true;
  }

  return orientationD === 0 && isPointOnSegment(firstEnd, secondStart, secondEnd);
}

export function isPointInsidePolygon(point: GeoPoint, polygon: GeoPoint[]) {
  if (polygon.length < 3) {
    return false;
  }

  let isInside = false;

  for (
    let index = 0, previousIndex = polygon.length - 1;
    index < polygon.length;
    previousIndex = index++
  ) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previousIndex];

    if (isPointOnSegment(point, previousPoint, currentPoint)) {
      return true;
    }

    const edgeIntersectsLatitude = currentPoint.lat > point.lat !== previousPoint.lat > point.lat;

    if (!edgeIntersectsLatitude) {
      continue;
    }

    const lngAtLatitude =
      ((previousPoint.lng - currentPoint.lng) * (point.lat - currentPoint.lat)) /
        (previousPoint.lat - currentPoint.lat) +
      currentPoint.lng;

    if (point.lng < lngAtLatitude) {
      isInside = !isInside;
    }
  }

  return isInside;
}

export function doesSegmentIntersectPolygon(start: GeoPoint, end: GeoPoint, polygon: GeoPoint[]) {
  if (polygon.length < 3) {
    return false;
  }

  if (isPointInsidePolygon(start, polygon) || isPointInsidePolygon(end, polygon)) {
    return true;
  }

  for (let index = 0; index < polygon.length; index += 1) {
    const edgeStart = polygon[index];
    const edgeEnd = polygon[(index + 1) % polygon.length];

    if (doSegmentsIntersect(start, end, edgeStart, edgeEnd)) {
      return true;
    }
  }

  return false;
}

export function didSegmentEnterPolygon(start: GeoPoint, end: GeoPoint, polygon: GeoPoint[]) {
  if (isPointInsidePolygon(start, polygon)) {
    return false;
  }

  return isPointInsidePolygon(end, polygon) || doesSegmentIntersectPolygon(start, end, polygon);
}
