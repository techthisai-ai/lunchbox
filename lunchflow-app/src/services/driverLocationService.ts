import * as Location from 'expo-location';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Alert, Platform } from 'react-native';
import { db } from '../lib/firebase';
import { GeoPoint } from '../types/delivery';
import { updateDriverLocation } from './orderHubService';

type TrackingState = {
  driverId: string;
  subscription: Location.LocationSubscription | { remove: () => void } | null;
  watchId: number | null;
  activeOrderIds: string[];
};

let tracking: TrackingState | null = null;

export type DriverLiveLocation = GeoPoint & {
  updatedAt?: string;
  driverId: string;
  name?: string;
};

function isUsablePoint(point: GeoPoint | null | undefined): point is GeoPoint {
  return Boolean(
    point &&
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng) &&
      Math.abs(point.lat) <= 90 &&
      Math.abs(point.lng) <= 180,
  );
}

let locationHintShown = false;

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
  }
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export function suggestTurnOnLocation(): void {
  if (locationHintShown) return;
  locationHintShown = true;
  Alert.alert(
    'Turn on location',
    'Please turn on location so LunchFlow can show your live delivery route on the map.',
  );
}

async function publishDriverLiveLocation(driverId: string, point: GeoPoint): Promise<void> {
  try {
    await setDoc(
      doc(db, 'drivers', driverId),
      {
        liveLocation: { ...point, updatedAt: new Date().toISOString() },
        lastSeenAt: new Date().toISOString(),
        status: tracking?.activeOrderIds.length ? 'On Route' : 'Available',
      },
      { merge: true },
    );
  } catch {
    // Ignore Firestore failures.
  }
}

async function publishPoint(driverId: string, orderIds: string[], point: GeoPoint): Promise<void> {
  await publishDriverLiveLocation(driverId, point);
  await Promise.all(orderIds.map((orderId) => updateDriverLocation(orderId, point).catch(() => undefined)));
}

function startWebWatch(driverId: string, orderIds: string[]): { remove: () => void; watchId: number } | null {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      if (!tracking || tracking.driverId !== driverId) return;
      const point: GeoPoint = { lat: position.coords.latitude, lng: position.coords.longitude };
      void publishPoint(driverId, tracking.activeOrderIds, point);
    },
    () => {
      suggestTurnOnLocation();
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
  );
  return {
    watchId,
    remove: () => navigator.geolocation.clearWatch(watchId),
  };
}

export async function startDriverLocationTracking(driverId: string, orderIds: string[]): Promise<void> {
  const granted = await requestLocationPermission();
  if (!granted) {
    suggestTurnOnLocation();
    return;
  }

  await stopDriverLocationTracking();

  tracking = { driverId, subscription: null, watchId: null, activeOrderIds: [...orderIds] };

  if (Platform.OS === 'web') {
    const web = startWebWatch(driverId, orderIds);
    if (web) {
      tracking.subscription = web;
      tracking.watchId = web.watchId;
    }
    // Immediate fix for admin map
    const immediate = await getCurrentDeviceLocation();
    if (immediate) await publishPoint(driverId, orderIds, immediate);
    return;
  }

  tracking.subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
      distanceInterval: 15,
    },
    async (position) => {
      if (!tracking) return;
      const point: GeoPoint = { lat: position.coords.latitude, lng: position.coords.longitude };
      await publishPoint(tracking.driverId, tracking.activeOrderIds, point);
    },
  );

  const immediate = await getCurrentDeviceLocation();
  if (immediate) await publishPoint(driverId, orderIds, immediate);
}

export async function stopDriverLocationTracking(): Promise<void> {
  if (tracking?.subscription) {
    tracking.subscription.remove();
  }
  if (tracking?.watchId != null && typeof navigator !== 'undefined') {
    navigator.geolocation.clearWatch(tracking.watchId);
  }
  tracking = null;
}

/**
 * Keep GPS publishing while the driver app is open, including while waiting for pickups.
 * Safe to call repeatedly when the order list changes.
 */
export async function refreshDriverLocationForOrders(driverId: string, orderIds: string[]): Promise<void> {
  if (tracking?.driverId === driverId) {
    tracking.activeOrderIds = [...orderIds];
    return;
  }

  await startDriverLocationTracking(driverId, orderIds);
}

export async function getCurrentDeviceLocation(): Promise<GeoPoint | null> {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        () => {
          suggestTurnOnLocation();
          resolve(null);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 },
      );
    });
  }

  const granted = await requestLocationPermission();
  if (!granted) {
    suggestTurnOnLocation();
    return null;
  }
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}

/** Live subscribe to drivers that have published a liveLocation (admin map). */
export function subscribeToDriverLiveLocations(
  onUpdate: (locations: DriverLiveLocation[]) => void,
): () => void {
  return onSnapshot(
    collection(db, 'drivers'),
    (snap) => {
      const locations: DriverLiveLocation[] = [];
      for (const docSnap of snap.docs) {
        const data = docSnap.data() as Record<string, unknown>;
        const live = data.liveLocation as { lat?: number; lng?: number; updatedAt?: string } | undefined;
        if (!isUsablePoint(live as GeoPoint | undefined)) continue;
        const approval = data.approvalStatus;
        if (approval === 'pending' || approval === 'rejected') continue;
        if (data.status === 'Offline') continue;
        const updatedAt = live?.updatedAt ? String(live.updatedAt) : undefined;
        if (updatedAt) {
          const ageMs = Date.now() - new Date(updatedAt).getTime();
          if (Number.isFinite(ageMs) && ageMs > 30 * 60 * 1000) continue;
        }
        locations.push({
          driverId: String(data.id ?? docSnap.id),
          name: data.name ? String(data.name) : undefined,
          lat: live!.lat!,
          lng: live!.lng!,
          updatedAt,
        });
      }
      onUpdate(locations);
    },
    () => onUpdate([]),
  );
}

export { isUsablePoint };
