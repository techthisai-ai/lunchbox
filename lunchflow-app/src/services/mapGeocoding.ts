import { DEMO_DROP, DEMO_PICKUP } from '../constants/maps';
import { GeoPoint } from '../types/delivery';

function hashAddress(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i += 1) {
    hash = (hash << 5) - hash + address.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Stable coordinates from address text (demo-friendly when Geocoding API is unavailable) */
export function geocodeAddress(address: string, fallback: GeoPoint): GeoPoint {
  const normalized = address.trim().toLowerCase();
  if (!normalized) return fallback;

  if (normalized.includes('green park')) return DEMO_PICKUP;
  if (normalized.includes('delhi public') || normalized.includes('dps')) return DEMO_DROP;

  const hash = hashAddress(normalized);
  const latOffset = ((hash % 1000) - 500) / 10000;
  const lngOffset = (((hash >> 10) % 1000) - 500) / 10000;

  return {
    lat: fallback.lat + latOffset,
    lng: fallback.lng + lngOffset,
  };
}

export function interpolatePoint(from: GeoPoint, to: GeoPoint, progress: number): GeoPoint {
  const t = Math.min(1, Math.max(0, progress));
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
}

export function driverProgressForStatus(status: string): number {
  if (status === 'driver_assigned' || status === 'at_pickup') return 0.12;
  if (status === 'pickup_verified') return 0.2;
  if (status === 'picked_up') return 0.35;
  if (status === 'in_transit') return 0.65;
  if (status === 'at_drop') return 0.92;
  if (status === 'delivered') return 1;
  return 0;
}
