import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, limit, orderBy, query, writeBatch, doc } from 'firebase/firestore';
import { normalizePhone } from '../constants/auth';
import { db } from '../lib/firebase';
import { formatRelativeTime } from '../utils/date';

export type NotificationIcon = 'bicycle' | 'checkmark-circle' | 'cube' | 'notifications';

export type AppNotification = {
  id: string;
  icon: NotificationIcon;
  title: string;
  msg: string;
  time: string;
  createdAt: number;
  read: boolean;
};

function storageKey(phone: string): string {
  return `@lunchflow_notifications_${normalizePhone(phone)}`;
}

function legacyStorageKeys(phone: string): string[] {
  const normalized = normalizePhone(phone);
  const raw = String(phone ?? '').trim();
  return Array.from(
    new Set(
      [
        storageKey(normalized),
        raw ? `@lunchflow_notifications_${raw}` : '',
        `@lunchflow_notifications_+91${normalized}`,
        `@lunchflow_notifications_91${normalized}`,
      ].filter(Boolean),
    ),
  );
}

function normalizeIcon(icon: unknown): NotificationIcon {
  if (icon === 'bicycle' || icon === 'checkmark-circle' || icon === 'cube' || icon === 'notifications') {
    return icon;
  }
  return 'notifications';
}

function createdAtMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  if (value && typeof value === 'object' && 'seconds' in value) {
    const seconds = Number((value as { seconds: number }).seconds);
    if (Number.isFinite(seconds)) return seconds * 1000;
  }
  return Date.now();
}

function toAppNotification(raw: Record<string, unknown>, fallbackId: string): AppNotification {
  const createdAt = createdAtMs(raw.createdAt);
  return {
    id: String(raw.id ?? fallbackId),
    icon: normalizeIcon(raw.icon),
    title: String(raw.title ?? 'Notification'),
    msg: String(raw.msg ?? raw.body ?? ''),
    createdAt,
    read: Boolean(raw.read),
    time: formatRelativeTime(createdAt),
  };
}

async function readLocalNotifications(phone: string): Promise<AppNotification[]> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return [];

  const byId = new Map<string, AppNotification>();
  let sawLegacyKey = false;
  for (const key of legacyStorageKeys(normalized)) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;
      if (key !== storageKey(normalized)) sawLegacyKey = true;
      const parsed = JSON.parse(raw) as Record<string, unknown>[];
      if (!Array.isArray(parsed)) continue;
      for (const item of parsed) {
        const entry = toAppNotification(item, `${Date.now()}`);
        const existing = byId.get(entry.id);
        if (!existing || existing.createdAt < entry.createdAt) {
          byId.set(entry.id, entry);
        } else if (existing && entry.read) {
          byId.set(entry.id, { ...existing, read: true });
        }
      }
    } catch {
      // Ignore corrupt local entries.
    }
  }

  const items = Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
  if (sawLegacyKey && items.length > 0) {
    await writeLocalNotifications(normalized, items);
  }
  return items;
}

async function writeLocalNotifications(phone: string, items: AppNotification[]): Promise<void> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return;
  const payload = items.slice(0, 30).map(({ id, icon, title, msg, createdAt, read }) => ({
    id,
    icon,
    title,
    msg,
    createdAt,
    read: Boolean(read),
  }));
  await AsyncStorage.setItem(storageKey(normalized), JSON.stringify(payload));

  // Clean legacy keys so mark-as-read can't be undone by an old unread copy.
  for (const key of legacyStorageKeys(normalized)) {
    if (key === storageKey(normalized)) continue;
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore.
    }
  }
}

async function loadRemoteNotifications(phone: string): Promise<AppNotification[]> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return [];
  try {
    const snap = await getDocs(
      query(collection(db, 'users', normalized, 'notifications'), orderBy('createdAt', 'desc'), limit(30)),
    );
    return snap.docs.map((entry) => toAppNotification(entry.data() as Record<string, unknown>, entry.id));
  } catch {
    try {
      const snap = await getDocs(collection(db, 'users', normalized, 'notifications'));
      return snap.docs
        .map((entry) => toAppNotification(entry.data() as Record<string, unknown>, entry.id))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 30);
    } catch {
      return [];
    }
  }
}

function mergeNotifications(local: AppNotification[], remote: AppNotification[]): AppNotification[] {
  const byId = new Map<string, AppNotification>();
  for (const item of [...remote, ...local]) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    byId.set(item.id, {
      ...existing,
      ...item,
      read: Boolean(existing.read || item.read),
      createdAt: Math.max(existing.createdAt, item.createdAt),
      time: formatRelativeTime(Math.max(existing.createdAt, item.createdAt)),
    });
  }
  return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
}

export async function loadNotifications(phone: string): Promise<AppNotification[]> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return [];

  const [local, remote] = await Promise.all([
    readLocalNotifications(normalized),
    loadRemoteNotifications(normalized),
  ]);
  return mergeNotifications(local, remote);
}

export async function pushNotification(
  phone: string,
  notification: Pick<AppNotification, 'icon' | 'title' | 'msg'>,
): Promise<void> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return;

  const existing = await loadNotifications(normalized);
  const duplicate = existing.find(
    (item) => item.title === notification.title && item.msg === notification.msg && Date.now() - item.createdAt < 60_000,
  );
  if (duplicate) return;

  const entry: AppNotification = {
    ...notification,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    read: false,
    time: 'Just now',
  };
  await writeLocalNotifications(normalized, [entry, ...existing]);
}

export async function markAllNotificationsRead(phone: string): Promise<void> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return;

  const items = await loadNotifications(normalized);
  const next = items.map((item) => ({ ...item, read: true }));
  await writeLocalNotifications(normalized, next);

  try {
    const snap = await getDocs(collection(db, 'users', normalized, 'notifications'));
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((entry) => {
      batch.set(doc(db, 'users', normalized, 'notifications', entry.id), { read: true }, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    console.warn('[markAllNotificationsRead] remote update failed', error);
  }
}

export async function markNotificationRead(phone: string, notificationId: string): Promise<void> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10 || !notificationId) return;

  const items = await loadNotifications(normalized);
  const next = items.map((item) => (item.id === notificationId ? { ...item, read: true } : item));
  await writeLocalNotifications(normalized, next);

  try {
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'users', normalized, 'notifications', notificationId),
      { read: true },
      { merge: true },
    );
    await batch.commit();
  } catch {
    // Local mark still applies when remote rules/auth block the write.
  }
}

export function countUnread(notifications: AppNotification[]): number {
  return notifications.filter((n) => !n.read).length;
}
