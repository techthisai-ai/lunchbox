import { haversineDistanceKm, estimateTravelMinutes } from './mapGeocoding';
import { GeoPoint } from '../types/delivery';
import { getCurrentDeviceLocation } from './driverLocationService';

export type EnfieldMapStop = {
  id: string;
  type: 'pickup' | 'drop' | 'driver';
  address: string;
  point: GeoPoint;
  sequence: number;
  status: 'pending' | 'completed';
};

export type EnfieldRouteResult = {
  stops: EnfieldMapStop[];
  polyline: GeoPoint[];
  totalDistanceKm: number;
  totalDurationMinutes: number;
  legs: Array<{ from: GeoPoint; to: GeoPoint; distanceKm: number; durationMinutes: number }>;
};

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

function toOsrmCoord(point: GeoPoint): string {
  return `${point.lng},${point.lat}`;
}

function decodeOsrmGeometry(coordinates: [number, number][]): GeoPoint[] {
  return coordinates.map(([lng, lat]) => ({ lat, lng }));
}

export function optimizeStopOrder(origin: GeoPoint, stops: EnfieldMapStop[]): EnfieldMapStop[] {
  // Keep every accepted stop (dedupe by id only). Do NOT collapse different
  // pickups that share nearby coordinates — all must stay on the map/route.
  const uniqueStops = stops.filter(
    (stop, index, list) => list.findIndex((candidate) => candidate.id === stop.id) === index,
  );

  if (uniqueStops.length <= 1) {
    return uniqueStops.map((stop, index) => ({ ...stop, sequence: index + 1 }));
  }

  const remaining = [...uniqueStops];
  const ordered: EnfieldMapStop[] = [];
  let cursor = origin;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Number.POSITIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const dist = haversineDistanceKm(cursor, remaining[index].point);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = index;
      }
    }

    const next = remaining.splice(nearestIdx, 1)[0];
    ordered.push(next);
    cursor = next.point;
  }

  return ordered.map((stop, index) => ({ ...stop, sequence: index + 1 }));
}

async function fetchOsrmRoute(points: GeoPoint[]): Promise<{
  polyline: GeoPoint[];
  distanceKm: number;
  durationMinutes: number;
  legs: EnfieldRouteResult['legs'];
}> {
  if (points.length < 2) {
    return { polyline: points, distanceKm: 0, durationMinutes: 0, legs: [] };
  }

  const coordPath = points.map(toOsrmCoord).join(';');
  const url = `${OSRM_BASE}/${coordPath}?overview=full&geometries=geojson&steps=false`;

  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller
      ? setTimeout(() => controller.abort(), 12000)
      : null;

    const response = await fetch(url, controller ? { signal: controller.signal } : undefined);
    if (timeout) clearTimeout(timeout);
    if (!response.ok) throw new Error('Route unavailable');
    const data = (await response.json()) as {
      routes?: Array<{
        distance?: number;
        duration?: number;
        geometry?: { coordinates?: [number, number][] };
        legs?: Array<{ distance?: number; duration?: number }>;
      }>;
    };

    const route = data.routes?.[0];
    if (!route) throw new Error('No route');

    const polyline = decodeOsrmGeometry(route.geometry?.coordinates ?? []);
    const legs =
      route.legs?.map((leg, index) => ({
        from: points[index],
        to: points[index + 1] ?? points[index],
        distanceKm: (leg.distance ?? 0) / 1000,
        durationMinutes: Math.max(1, Math.ceil((leg.duration ?? 0) / 60)),
      })) ?? [];

    return {
      polyline,
      distanceKm: (route.distance ?? 0) / 1000,
      durationMinutes: Math.max(1, Math.ceil((route.duration ?? 0) / 60)),
      legs,
    };
  } catch {
    const legs: EnfieldRouteResult['legs'] = [];
    let totalDistanceKm = 0;
    let totalDurationMinutes = 0;
    const polyline: GeoPoint[] = [points[0]];

    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1];
      const to = points[index];
      const distanceKm = haversineDistanceKm(from, to);
      const durationMinutes = estimateTravelMinutes(from, to);
      legs.push({ from, to, distanceKm, durationMinutes });
      totalDistanceKm += distanceKm;
      totalDurationMinutes += durationMinutes;
      polyline.push(to);
    }

    return { polyline, distanceKm: totalDistanceKm, durationMinutes: totalDurationMinutes, legs };
  }
}

export async function buildEnfieldRoute(
  origin: GeoPoint,
  stops: EnfieldMapStop[],
): Promise<EnfieldRouteResult> {
  const pending = stops.filter((stop) => stop.status !== 'completed');
  if (pending.length === 0) {
    return {
      stops: [],
      polyline: [],
      totalDistanceKm: 0,
      totalDurationMinutes: 0,
      legs: [],
    };
  }

  const optimized = optimizeStopOrder(origin, pending);
  const path = [origin, ...optimized.map((stop) => stop.point)];
  const routed = await fetchOsrmRoute(path);

  return {
    stops: optimized,
    polyline: routed.polyline,
    totalDistanceKm: routed.distanceKm,
    totalDurationMinutes: routed.durationMinutes,
    legs: routed.legs,
  };
}

export async function getDeviceLocationForMaps(): Promise<GeoPoint | null> {
  const nativePoint = await getCurrentDeviceLocation();
  if (nativePoint) return nativePoint;

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 },
      );
    });
  }
  return null;
}

export function isNearStop(driver: GeoPoint, stop: GeoPoint, radiusKm = 0.25): boolean {
  return haversineDistanceKm(driver, stop) <= radiusKm;
}
