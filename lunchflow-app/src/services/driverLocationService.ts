import * as Location from 'expo-location';
import { doc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '../lib/firebase';
import { GeoPoint } from '../types/delivery';
import { updateDriverLocation } from './orderHubService';

type TrackingState = {
  driverId: string;
  subscription: Location.LocationSubscription | null;
  activeOrderIds: string[];
};

let tracking: TrackingState | null = null;

export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

async function publishDriverLiveLocation(driverId: string, point: GeoPoint): Promise<void> {
  try {
    await setDoc(
      doc(db, 'drivers', driverId),
      {
        liveLocation: { ...point, updatedAt: new Date().toISOString() },
        lastSeenAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch {
    // Ignore Firestore failures.
  }
}

export async function startDriverLocationTracking(driverId: string, orderIds: string[]): Promise<void> {
  if (Platform.OS === 'web') return;

  const granted = await requestLocationPermission();
  if (!granted) return;

  await stopDriverLocationTracking();

  tracking = { driverId, subscription: null, activeOrderIds: orderIds };

  tracking.subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
      distanceInterval: 15,
    },
    async (position) => {
      if (!tracking) return;
      const point: GeoPoint = { lat: position.coords.latitude, lng: position.coords.longitude };
      await publishDriverLiveLocation(tracking.driverId, point);
      await Promise.all(
        tracking.activeOrderIds.map((orderId) =>
          updateDriverLocation(orderId, point).catch(() => undefined),
        ),
      );
    },
  );
}

export async function stopDriverLocationTracking(): Promise<void> {
  if (tracking?.subscription) {
    tracking.subscription.remove();
  }
  tracking = null;
}

export async function refreshDriverLocationForOrders(driverId: string, orderIds: string[]): Promise<void> {
  if (Platform.OS === 'web') return;

  if (tracking?.driverId === driverId) {
    tracking.activeOrderIds = orderIds;
    return;
  }

  if (orderIds.length === 0) {
    await stopDriverLocationTracking();
    return;
  }

  await startDriverLocationTracking(driverId, orderIds);
}

export async function getCurrentDeviceLocation(): Promise<GeoPoint | null> {
  if (Platform.OS === 'web') return null;
  const granted = await requestLocationPermission();
  if (!granted) return null;
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}
