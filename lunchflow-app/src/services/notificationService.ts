import AsyncStorage from '@react-native-async-storage/async-storage';
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
  return `@lunchflow_notifications_${phone}`;
}

export async function loadNotifications(phone: string): Promise<AppNotification[]> {
  if (!phone) return [];
  try {
    const raw = await AsyncStorage.getItem(storageKey(phone));
    if (!raw) return [];
    const items = JSON.parse(raw) as AppNotification[];
    return items.map((item) => ({
      ...item,
      time: formatRelativeTime(item.createdAt),
    }));
  } catch {
    return [];
  }
}

export async function pushNotification(
  phone: string,
  notification: Pick<AppNotification, 'icon' | 'title' | 'msg'>,
): Promise<void> {
  if (!phone) return;
  const existing = await loadNotifications(phone);
  const entry: AppNotification = {
    ...notification,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    read: false,
    time: 'Just now',
  };
  await AsyncStorage.setItem(storageKey(phone), JSON.stringify([entry, ...existing].slice(0, 30)));
}

export async function markAllNotificationsRead(phone: string): Promise<void> {
  const items = await loadNotifications(phone);
  await AsyncStorage.setItem(
    storageKey(phone),
    JSON.stringify(items.map((item) => ({ ...item, read: true }))),
  );
}

export function countUnread(notifications: AppNotification[]): number {
  return notifications.filter((n) => !n.read).length;
}
