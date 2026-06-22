import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { DEMO_DROP, DEMO_PICKUP } from '../constants/maps';
import { db } from '../lib/firebase';
import { GeoPoint } from '../types/delivery';

const MEMORY_CACHE = new Map<string, GeoPoint>();
const STORAGE_CACHE_KEY = '@lunchflow_geocode_cache_v1';

function hashAddress(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i += 1) {
    hash = (hash << 5) - hash + address.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function cacheKey(address: string): string {
  return address.trim().toLowerCase();
}

function getGoogleMapsApiKey(): string | null {
  const extra = Constants.expoConfig?.extra as { googleMapsApiKey?: string } | undefined;
  return extra?.googleMapsApiKey ?? null;
}

/** Stable coordinates from address text (fallback when Geocoding API is unavailable) */
export function geocodeAddress(address: string, fallback: GeoPoint): GeoPoint {
  const normalized = cacheKey(address);
  if (!normalized) return fallback;

  const cached = MEMORY_CACHE.get(normalized);
  if (cached) return cached;

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

async function readStorageCache(): Promise<Record<string, GeoPoint>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, GeoPoint>) : {};
  } catch {
    return {};
  }
}

async function writeStorageCache(cache: Record<string, GeoPoint>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(cache));
}

async function fetchGoogleGeocode(address: string, apiKey: string): Promise<GeoPoint | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = (await response.json()) as {
    status?: string;
    results?: { geometry?: { location?: { lat?: number; lng?: number } } }[];
  };
  if (data.status !== 'OK' || !data.results?.[0]?.geometry?.location) return null;
  const { lat, lng } = data.results[0].geometry.location;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { lat, lng };
}

export async function geocodeAddressAsync(address: string, fallback: GeoPoint): Promise<GeoPoint> {
  const key = cacheKey(address);
  if (!key) return fallback;

  const memoryHit = MEMORY_CACHE.get(key);
  if (memoryHit) return memoryHit;

  const localCache = await readStorageCache();
  if (localCache[key]) {
    MEMORY_CACHE.set(key, localCache[key]);
    return localCache[key];
  }

  try {
    const snap = await getDoc(doc(db, 'geocodeCache', encodeURIComponent(key).slice(0, 500)));
    if (snap.exists()) {
      const point = snap.data() as GeoPoint;
      MEMORY_CACHE.set(key, point);
      return point;
    }
  } catch {
    // Ignore.
  }

  const apiKey = getGoogleMapsApiKey();
  if (apiKey) {
    try {
      const googlePoint = await fetchGoogleGeocode(address, apiKey);
      if (googlePoint) {
        MEMORY_CACHE.set(key, googlePoint);
        localCache[key] = googlePoint;
        await writeStorageCache(localCache);
        try {
          await setDoc(doc(db, 'geocodeCache', encodeURIComponent(key).slice(0, 500)), googlePoint, { merge: true });
        } catch {
          // Ignore.
        }
        return googlePoint;
      }
    } catch {
      // Fall back below.
    }
  }

  const point = geocodeAddress(address, fallback);
  MEMORY_CACHE.set(key, point);
  return point;
}

export function interpolatePoint(from: GeoPoint, to: GeoPoint, progress: number): GeoPoint {
  const t = Math.min(1, Math.max(0, progress));
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
}

export function haversineDistanceKm(from: GeoPoint, to: GeoPoint): number {
  const earthRadiusKm = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

export function estimateTravelMinutes(from: GeoPoint, to: GeoPoint, speedKmh = 28): number {
  const distanceKm = haversineDistanceKm(from, to);
  return Math.max(1, Math.ceil((distanceKm / speedKmh) * 60));
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

export function isRecentGpsLocation(updatedAt?: string, maxAgeMs = 120000): boolean {
  if (!updatedAt) return false;
  return Date.now() - new Date(updatedAt).getTime() <= maxAgeMs;
}
