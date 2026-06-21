import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeliveryOrder } from '../types/delivery';
import { formatDisplayDate } from '../utils/date';

export type DeliveryHistoryEntry = {
  id: string;
  date: string;
  dateKey: string;
  route: string;
  status: string;
  time: string;
  school: string;
};

function storageKey(phone: string): string {
  return `@lunchflow_history_${phone}`;
}

export async function loadDeliveryHistory(phone: string): Promise<DeliveryHistoryEntry[]> {
  if (!phone) return [];
  try {
    const raw = await AsyncStorage.getItem(storageKey(phone));
    if (!raw) return [];
    return JSON.parse(raw) as DeliveryHistoryEntry[];
  } catch {
    return [];
  }
}

export async function saveDeliveryHistory(phone: string, entries: DeliveryHistoryEntry[]): Promise<void> {
  if (!phone) return;
  await AsyncStorage.setItem(storageKey(phone), JSON.stringify(entries.slice(0, 50)));
}

export async function addDeliveryToHistory(phone: string, order: DeliveryOrder): Promise<void> {
  const entries = await loadDeliveryHistory(phone);
  const entry = buildHistoryEntry(order);

  const withoutDuplicate = entries.filter((e) => e.id !== entry.id);
  await saveDeliveryHistory(phone, [entry, ...withoutDuplicate]);
}

function buildHistoryEntry(order: DeliveryOrder): DeliveryHistoryEntry {
  const isDelivered = order.status === 'delivered';
  const isActive =
    order.status === 'in_transit' ||
    order.status === 'at_drop' ||
    order.status === 'picked_up' ||
    order.status === 'driver_assigned' ||
    order.status === 'awaiting_driver' ||
    order.status === 'pickup_verified' ||
    order.status === 'at_pickup';

  return {
    id: order.id,
    date: formatDisplayDate(new Date()),
    dateKey: order.date || new Date().toISOString().slice(0, 10),
    route: `${order.pickupAddress} → ${order.school}`,
    status: isDelivered ? 'Delivered' : isActive ? 'In Transit' : 'Cancelled',
    time: order.deliveredAt ?? order.pickedUpAt ?? order.foodReadyAt ?? order.bookedAt ?? '—',
    school: order.school,
  };
}

export async function syncDeliveryHistory(
  phone: string,
  orders: DeliveryOrder[],
): Promise<DeliveryHistoryEntry[]> {
  if (!phone) return [];

  const existing = await loadDeliveryHistory(phone);
  const byId = new Map(existing.map((entry) => [entry.id, entry]));

  for (const order of orders) {
    if (order.status === 'booked') continue;
    byId.set(order.id, buildHistoryEntry(order));
  }

  const merged = Array.from(byId.values()).sort((a, b) => {
    if (a.status === 'In Transit' && b.status === 'Delivered') return -1;
    if (a.status === 'Delivered' && b.status === 'In Transit') return 1;
    return 0;
  });

  await saveDeliveryHistory(phone, merged);
  return merged;
}
