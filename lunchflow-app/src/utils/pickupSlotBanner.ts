import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizePhone } from '../constants/auth';

export const PICKUP_SLOT_BANNER_DURATION_MS = 10 * 60 * 1000;

type PickupSlotBannerSession = {
  expiresAt: number;
  pickupAddress: string;
};

function storageKey(phone: string): string {
  return `@lunchflow_pickup_slot_banner_${normalizePhone(phone)}`;
}

function normalizePickupAddressKey(pickupAddress: string): string {
  return pickupAddress.trim().toLowerCase();
}

async function readSession(phone: string): Promise<PickupSlotBannerSession | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(phone));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PickupSlotBannerSession;
    if (!parsed?.expiresAt || !parsed.pickupAddress) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function activatePickupSlotBanner(phone: string, pickupAddress: string): Promise<number> {
  const expiresAt = Date.now() + PICKUP_SLOT_BANNER_DURATION_MS;
  const session: PickupSlotBannerSession = {
    expiresAt,
    pickupAddress: normalizePickupAddressKey(pickupAddress),
  };
  await AsyncStorage.setItem(storageKey(phone), JSON.stringify(session));
  return expiresAt;
}

/** Reuses the active session only when the pickup address is unchanged. */
export async function ensurePickupSlotBannerForAddress(phone: string, pickupAddress: string): Promise<number> {
  const now = Date.now();
  const key = normalizePickupAddressKey(pickupAddress);
  const existing = await readSession(phone);
  if (existing && existing.pickupAddress === key && existing.expiresAt > now) {
    return existing.expiresAt;
  }
  return activatePickupSlotBanner(phone, pickupAddress);
}

export async function getPickupSlotBannerExpiry(phone: string): Promise<number> {
  const session = await readSession(phone);
  return session?.expiresAt ?? 0;
}

export async function clearPickupSlotBannerSession(phone: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(phone));
}
