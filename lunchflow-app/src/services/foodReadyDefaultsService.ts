import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizePhone } from '../constants/auth';
import {
  FoodReadyDetails,
  FoodReadyStudentEntry,
  buildFoodReadyStudents,
  foodReadyStudentsToLegacy,
  normalizeDeliveryType,
  normalizeDeliveryTypes,
} from '../types/delivery';
import { loadDocument, syncDocument } from './firestoreSync';

function defaultsKey(phone: string): string {
  return `@lunchflow_food_ready_defaults_${normalizePhone(phone)}`;
}

function filledStudents(students: FoodReadyStudentEntry[]): FoodReadyStudentEntry[] {
  return students
    .map((entry) => ({
      name: entry.name.trim(),
      dropLocation: entry.dropLocation.trim(),
      classSection: entry.classSection.trim(),
      deliveryType: normalizeDeliveryType(entry.deliveryType),
    }))
    .filter((entry) => entry.name && entry.dropLocation && entry.classSection);
}

export function normalizeFoodReadyDetails(
  partial?: Partial<FoodReadyDetails> | null,
): FoodReadyDetails | null {
  if (!partial) return null;

  const name = partial.name?.trim() ?? '';
  const pickupAddress = partial.pickupAddress?.trim() ?? '';
  if (!name || !pickupAddress) return null;

  const selectedWhere = normalizeDeliveryTypes(
    partial.deliveryTypes ?? partial.students?.map((entry) => entry.deliveryType),
    normalizeDeliveryType(partial.deliveryType),
  );
  if (!selectedWhere.length) return null;

  const students = filledStudents(buildFoodReadyStudents(partial));
  if (!students.length) return null;

  for (const entry of students) {
    if (!selectedWhere.includes(entry.deliveryType)) return null;
  }

  const legacy = foodReadyStudentsToLegacy(students);
  return {
    name,
    pickupAddress,
    dropAddress: legacy.dropAddress,
    person: legacy.person,
    persons: legacy.persons,
    students,
    deliveryType: students[0]?.deliveryType ?? selectedWhere[0],
    deliveryTypes: selectedWhere,
  };
}

export function isCompleteFoodReadyDefaults(
  partial?: Partial<FoodReadyDetails> | null,
): partial is FoodReadyDetails {
  return normalizeFoodReadyDetails(partial) !== null;
}

export async function loadFoodReadyDefaults(phone: string): Promise<FoodReadyDetails | null> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return null;

  try {
    const raw = await AsyncStorage.getItem(defaultsKey(normalized));
    const local = raw ? normalizeFoodReadyDetails(JSON.parse(raw) as Partial<FoodReadyDetails>) : null;
    if (local) return local;
  } catch {
    // Fall through to remote.
  }

  try {
    const remote = await loadDocument<Partial<FoodReadyDetails>>('food_ready_defaults', normalized);
    const hydrated = normalizeFoodReadyDetails(remote);
    if (hydrated) {
      await AsyncStorage.setItem(defaultsKey(normalized), JSON.stringify(hydrated));
      return hydrated;
    }
  } catch {
    return null;
  }

  return null;
}

export async function saveFoodReadyDefaults(phone: string, details: FoodReadyDetails): Promise<void> {
  const normalized = normalizePhone(phone);
  const record = normalizeFoodReadyDetails(details);
  if (!record || normalized.length !== 10) return;

  await AsyncStorage.setItem(defaultsKey(normalized), JSON.stringify(record));
  await syncDocument('food_ready_defaults', normalized, record as unknown as Record<string, unknown>);
}
