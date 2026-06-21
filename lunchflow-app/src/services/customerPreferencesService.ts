import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationPreferences = {
  push: boolean;
  sms: boolean;
  whatsapp: boolean;
};

const DEFAULT_PREFS: NotificationPreferences = {
  push: true,
  sms: true,
  whatsapp: true,
};

function storageKey(phone: string): string {
  return `@lunchflow_notification_prefs_${phone}`;
}

export async function loadNotificationPreferences(phone: string): Promise<NotificationPreferences> {
  if (!phone) return DEFAULT_PREFS;
  try {
    const raw = await AsyncStorage.getItem(storageKey(phone));
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as NotificationPreferences) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveNotificationPreferences(
  phone: string,
  prefs: NotificationPreferences,
): Promise<void> {
  if (!phone) return;
  await AsyncStorage.setItem(storageKey(phone), JSON.stringify(prefs));
}
