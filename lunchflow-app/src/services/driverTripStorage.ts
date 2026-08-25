import AsyncStorage from '@react-native-async-storage/async-storage';
import { DriverTripSnapshot } from '../utils/driverTripNavigation';

type PersistedDriverTrip = {
  trip: DriverTripSnapshot;
  stats?: {
    ordersDelivered: number;
    totalDistanceKm: number;
    totalDurationMinutes: number;
    totalEarnings: number;
    completedAt: string | null;
  };
};

function storageKey(driverId: string): string {
  return `@lunchflow_driver_trip_${driverId}`;
}

export async function loadPersistedDriverTrip(driverId: string): Promise<PersistedDriverTrip | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(driverId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedDriverTrip;
    if (parsed?.trip?.phase !== 'pickup' && parsed?.trip?.phase !== 'delivery') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function savePersistedDriverTrip(driverId: string, payload: PersistedDriverTrip): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(driverId), JSON.stringify(payload));
  } catch {
    // Ignore storage failures.
  }
}

export async function clearPersistedDriverTrip(driverId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(driverId));
  } catch {
    // Ignore storage failures.
  }
}
