import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { CHENNAI_SERVICE_RADIUS_KM, DEFAULT_MAP_CENTER, DEMO_DROP, DEMO_PICKUP } from '../constants/maps';
import { db } from '../lib/firebase';
import { DeliveryOrder, GeoPoint, getDropAddress } from '../types/delivery';

const MEMORY_CACHE = new Map<string, GeoPoint>();
const STORAGE_CACHE_KEY = '@lunchflow_geocode_cache_v3';

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

function formatGeocodeQuery(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return 'Chennai, Tamil Nadu, India';
  const lower = trimmed.toLowerCase();
  if (lower.includes('tamil nadu') || lower.includes(', india')) return trimmed;
  return `${trimmed}, Tamil Nadu, India`;
}

/** Tamil Nadu bounding box for map defaults */
export function isTamilNaduPoint(point: GeoPoint): boolean {
  return point.lat >= 8 && point.lat <= 13.6 && point.lng >= 76.2 && point.lng <= 80.5;
}

function addressMentions(address: string, token: string): boolean {
  return address.toLowerCase().includes(token);
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

/** Reject legacy Delhi / far-south coords and other bad cached points */
export function isTrustedMapPoint(stored: GeoPoint | null | undefined, address: string): boolean {
  if (!stored) return false;
  if (!isTamilNaduPoint(stored)) return false;
  if (stored.lat > 14.5) return false;

  const distFromChennai = haversineDistanceKm(stored, DEFAULT_MAP_CENTER);
  const addr = address.trim().toLowerCase();
  if (!addr) return distFromChennai <= CHENNAI_SERVICE_RADIUS_KM;

  if (addressMentions(addr, 'coimbatore')) return distFromChennai < 450;
  if (addressMentions(addr, 'madurai')) return distFromChennai < 450;
  if (addressMentions(addr, 'vellore')) return distFromChennai < 220;
  if (addressMentions(addr, 'trichy') || addressMentions(addr, 'tiruchirappalli')) return distFromChennai < 380;
  if (addressMentions(addr, 'chennai')) return distFromChennai < CHENNAI_SERVICE_RADIUS_KM;

  return distFromChennai <= CHENNAI_SERVICE_RADIUS_KM;
}

export function isPlausibleDeliveryPair(pickup: GeoPoint, drop: GeoPoint): boolean {
  return haversineDistanceKm(pickup, drop) <= 200;
}

export function resolveMapPoint(
  stored: GeoPoint | null | undefined,
  address: string,
  fallback: GeoPoint,
): GeoPoint {
  if (stored && isTrustedMapPoint(stored, address)) return stored;
  return geocodeAddress(address, fallback);
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
  if (cached && isTrustedMapPoint(cached, address)) return cached;

  if (normalized.includes('stella') || normalized.includes('school') || normalized.includes('college')) {
    return DEMO_DROP;
  }
  if (
    normalized.includes('north street') ||
    normalized.includes('anna nagar') ||
    normalized.includes('t nagar') ||
    normalized.includes('mc nichols') ||
    normalized.includes('mcnichols') ||
    normalized.includes('home')
  ) {
    return DEMO_PICKUP;
  }
  if (normalized.includes('chennai') || normalized.includes('coimbatore') || normalized.includes('madurai')) {
    const cityHash = hashAddress(normalized);
    return {
      lat: fallback.lat + (((cityHash % 200) - 100) / 10000),
      lng: fallback.lng + ((((cityHash >> 8) % 200) - 100) / 10000),
    };
  }

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

async function fetchNominatimGeocode(address: string): Promise<GeoPoint | null> {
  const query = formatGeocodeQuery(address);
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'LunchFlow/1.0 (lunch delivery app)',
      },
    });
    if (!response.ok) return null;
    const results = (await response.json()) as { lat?: string; lon?: string }[];
    const hit = results?.[0];
    if (!hit?.lat || !hit?.lon) return null;
    const lat = Number(hit.lat);
    const lng = Number(hit.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const point = { lat, lng };
    if (!isTrustedMapPoint(point, address)) return null;
    return point;
  } catch {
    return null;
  }
}

async function fetchGoogleGeocode(address: string, apiKey: string): Promise<GeoPoint | null> {
  const query = formatGeocodeQuery(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = (await response.json()) as {
    status?: string;
    results?: { geometry?: { location?: { lat?: number; lng?: number } } }[];
  };
  if (data.status !== 'OK' || !data.results?.[0]?.geometry?.location) return null;
  const { lat, lng } = data.results[0].geometry.location;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  const point = { lat, lng };
  if (!isTrustedMapPoint(point, address)) return null;
  return point;
}

async function cacheGeocodeResult(key: string, point: GeoPoint, address: string): Promise<GeoPoint> {
  MEMORY_CACHE.set(key, point);
  const localCache = await readStorageCache();
  localCache[key] = point;
  await writeStorageCache(localCache);
  try {
    await setDoc(doc(db, 'geocodeCache', encodeURIComponent(key).slice(0, 500)), point, { merge: true });
  } catch {
    // Ignore.
  }
  return point;
}

export async function geocodeAddressAsync(address: string, fallback: GeoPoint): Promise<GeoPoint> {
  const key = cacheKey(address);
  if (!key) return fallback;

  const memoryHit = MEMORY_CACHE.get(key);
  if (memoryHit && isTrustedMapPoint(memoryHit, address)) return memoryHit;

  const localCache = await readStorageCache();
  if (localCache[key] && isTrustedMapPoint(localCache[key], address)) {
    MEMORY_CACHE.set(key, localCache[key]);
    return localCache[key];
  }

  try {
    const snap = await getDoc(doc(db, 'geocodeCache', encodeURIComponent(key).slice(0, 500)));
    if (snap.exists()) {
      const point = snap.data() as GeoPoint;
      if (isTrustedMapPoint(point, address)) {
        MEMORY_CACHE.set(key, point);
        return point;
      }
    }
  } catch {
    // Ignore.
  }

  const nominatimPoint = await fetchNominatimGeocode(address);
  if (nominatimPoint) {
    return cacheGeocodeResult(key, nominatimPoint, address);
  }

  const apiKey = getGoogleMapsApiKey();
  if (apiKey) {
    try {
      const googlePoint = await fetchGoogleGeocode(address, apiKey);
      if (googlePoint) {
        return cacheGeocodeResult(key, googlePoint, address);
      }
    } catch {
      // Fall back below.
    }
  }

  const point = geocodeAddress(address, fallback);
  MEMORY_CACHE.set(key, point);
  return point;
}

export async function resolveOrderLocationsAsync(
  order: Pick<DeliveryOrder, 'pickupAddress' | 'dropAddress' | 'school' | 'pickupLocation' | 'dropLocation'>,
): Promise<{ pickupLocation: GeoPoint; dropLocation: GeoPoint }> {
  const pickupAddress = order.pickupAddress?.trim() ?? '';
  const dropAddress = getDropAddress(order)?.trim() ?? '';

  let pickupLocation = order.pickupLocation;
  let dropLocation = order.dropLocation;

  if (!pickupLocation || !isTrustedMapPoint(pickupLocation, pickupAddress)) {
    pickupLocation = pickupAddress
      ? await geocodeAddressAsync(pickupAddress, DEMO_PICKUP)
      : DEMO_PICKUP;
  }

  if (!dropLocation || !isTrustedMapPoint(dropLocation, dropAddress)) {
    dropLocation = dropAddress ? await geocodeAddressAsync(dropAddress, DEMO_DROP) : DEMO_DROP;
  }

  if (!isPlausibleDeliveryPair(pickupLocation, dropLocation)) {
    if (pickupAddress) {
      pickupLocation = await geocodeAddressAsync(pickupAddress, DEMO_PICKUP);
    }
    if (dropAddress) {
      dropLocation = await geocodeAddressAsync(dropAddress, DEMO_DROP);
    }
  }

  return { pickupLocation, dropLocation };
}

export function interpolatePoint(from: GeoPoint, to: GeoPoint, progress: number): GeoPoint {
  const t = Math.min(1, Math.max(0, progress));
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
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
