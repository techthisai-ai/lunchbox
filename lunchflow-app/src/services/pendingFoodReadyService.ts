import AsyncStorage from '@react-native-async-storage/async-storage';
import { FoodReadyDetails } from '../types/delivery';
import { normalizePhone } from '../constants/auth';

function pendingKey(phone: string): string {
  return `@lunchflow_pending_food_ready_${normalizePhone(phone)}`;
}

export async function savePendingFoodReady(phone: string, details: FoodReadyDetails): Promise<void> {
  await AsyncStorage.setItem(pendingKey(phone), JSON.stringify(details));
}

export async function loadPendingFoodReady(phone: string): Promise<FoodReadyDetails | null> {
  try {
    const raw = await AsyncStorage.getItem(pendingKey(phone));
    return raw ? (JSON.parse(raw) as FoodReadyDetails) : null;
  } catch {
    return null;
  }
}

export async function clearPendingFoodReady(phone: string): Promise<void> {
  await AsyncStorage.removeItem(pendingKey(phone));
}

export function countFoodReadyPeople(details: FoodReadyDetails): number {
  const namedStudents = details.students?.filter((entry) => entry.name.trim()) ?? [];
  if (namedStudents.length > 0) return namedStudents.length;
  const legacyNames = details.persons?.filter((entry) => entry.trim()) ?? [];
  if (legacyNames.length > 0) return legacyNames.length;
  return details.person?.trim() ? 1 : 0;
}
