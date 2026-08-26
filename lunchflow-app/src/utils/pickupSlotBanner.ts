import AsyncStorage from '@react-native-async-storage/async-storage';

export const PICKUP_SLOT_BANNER_DURATION_MS = 10 * 60 * 1000;

function storageKey(phone: string): string {
  return `@lunchflow_pickup_slot_banner_until_${phone}`;
}

export async function activatePickupSlotBanner(phone: string): Promise<number> {
  const expiresAt = Date.now() + PICKUP_SLOT_BANNER_DURATION_MS;
  await AsyncStorage.setItem(storageKey(phone), String(expiresAt));
  return expiresAt;
}

export async function getPickupSlotBannerExpiry(phone: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(phone));
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

/** Starts a new 10-minute banner session, or returns the active one. */
export async function ensurePickupSlotBannerSession(phone: string): Promise<{ expiresAt: number }> {
  const now = Date.now();
  const existing = await getPickupSlotBannerExpiry(phone);
  if (existing > now) {
    return { expiresAt: existing };
  }
  const expiresAt = await activatePickupSlotBanner(phone);
  return { expiresAt };
}

export async function clearPickupSlotBannerSession(phone: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(phone));
}
