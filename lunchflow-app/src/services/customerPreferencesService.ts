import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc } from 'firebase/firestore';
import { normalizePhone } from '../constants/auth';
import { db } from '../lib/firebase';

export type NotificationPreferences = {
  push: boolean;
  sms: boolean;
  whatsapp: boolean;
};

export type AppLanguage = 'en' | 'hi';

export const LANGUAGE_OPTIONS: { code: AppLanguage; label: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी' },
];

export function getLanguageLabel(code: AppLanguage): string {
  return LANGUAGE_OPTIONS.find((option) => option.code === code)?.label ?? 'English';
}

const DEFAULT_PREFS: NotificationPreferences = {
  push: true,
  sms: true,
  whatsapp: true,
};

function storageKey(phone: string): string {
  return `@lunchflow_notification_prefs_${phone}`;
}

function languageStorageKey(phone: string): string {
  return `@lunchflow_language_${phone}`;
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
  const normalized = normalizePhone(phone);
  await AsyncStorage.setItem(storageKey(normalized), JSON.stringify(prefs));

  try {
    await setDoc(
      doc(db, 'users', normalized),
      {
        phone: normalized,
        notificationPrefs: prefs,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch {
    // Local prefs remain available when Firestore is offline.
  }
}

export async function syncNotificationProfile(
  phone: string,
  extras?: { expoPushToken?: string | null; name?: string },
): Promise<void> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return;

  const prefs = await loadNotificationPreferences(normalized);
  try {
    await setDoc(
      doc(db, 'users', normalized),
      {
        phone: normalized,
        notificationPrefs: prefs,
        ...(extras?.name ? { name: extras.name } : {}),
        ...(extras?.expoPushToken !== undefined ? { expoPushToken: extras.expoPushToken } : {}),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch {
    // Ignore sync failures; Cloud Functions fall back to default prefs.
  }
}

export async function loadLanguagePreference(phone: string): Promise<AppLanguage> {
  if (!phone) return 'en';
  try {
    const raw = await AsyncStorage.getItem(languageStorageKey(normalizePhone(phone)));
    if (raw === 'hi' || raw === 'en') return raw;
    return 'en';
  } catch {
    return 'en';
  }
}

export async function saveLanguagePreference(phone: string, language: AppLanguage): Promise<void> {
  if (!phone) return;
  const normalized = normalizePhone(phone);
  await AsyncStorage.setItem(languageStorageKey(normalized), language);

  try {
    await setDoc(
      doc(db, 'users', normalized),
      {
        phone: normalized,
        language,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch {
    // Local preference remains available when Firestore is offline.
  }
}
