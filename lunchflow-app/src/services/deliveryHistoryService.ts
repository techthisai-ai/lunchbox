import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_DELIVERY_FEE } from '../constants/business';
import { DeliveryOrder } from '../types/delivery';
import { formatHistoryDate, resolveHistoryDateKey } from '../utils/date';

export type DeliveryHistoryEntry = {
  id: string;
  date: string;
  dateKey: string;
  route: string;
  status: string;
  time: string;
  school: string;
  pickupLabel: string;
  destinationName: string;
  destinationAddress: string;
  price: string;
};

function storageKey(phone: string): string {
  return `@lunchflow_history_${phone}`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseDestination(order: DeliveryOrder): { name: string; address: string } {
  const drop = order.dropAddress?.trim() || order.school?.trim() || 'Drop location';
  const firstStop = order.studentEntries?.[0]?.dropLocation?.trim();

  if (firstStop) {
    const address =
      drop !== firstStop && drop.includes(firstStop)
        ? drop.replace(firstStop, '').replace(/^,\s*/, '').trim()
        : drop !== firstStop
          ? drop
          : '';
    return { name: firstStop, address };
  }

  const commaIndex = drop.indexOf(',');
  if (commaIndex > 0) {
    return {
      name: drop.slice(0, commaIndex).trim(),
      address: drop.slice(commaIndex + 1).trim(),
    };
  }

  return { name: drop, address: '' };
}

function formatHistoryTime(raw: string | null | undefined): string {
  if (!raw?.trim()) return '—';
  const trimmed = raw.trim();
  if (/am|pm/i.test(trimmed)) return trimmed;
  const parsed = Date.parse(`1970-01-01 ${trimmed}`);
  if (Number.isNaN(parsed)) return trimmed;
  return new Date(parsed).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
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
    order.status === 'at_pickup' ||
    order.status === 'food_ready';

  const dateKey = order.date || todayKey();
  const destination = parseDestination(order);

  return {
    id: order.id,
    date: formatHistoryDate(dateKey),
    dateKey,
    route: `${order.pickupAddress} → ${order.school}`,
    status: isDelivered ? 'Delivered' : isActive ? 'In Transit' : 'Cancelled',
    time: formatHistoryTime(order.deliveredAt ?? order.pickedUpAt ?? order.foodReadyAt ?? order.bookedAt),
    school: order.school,
    pickupLabel: 'Home',
    destinationName: destination.name,
    destinationAddress: destination.address,
    price: `₹${DEFAULT_DELIVERY_FEE}`,
  };
}

function hydrateHistoryEntry(entry: DeliveryHistoryEntry): DeliveryHistoryEntry {
  const dateKey = resolveHistoryDateKey(entry);
  const destinationName = entry.destinationName || entry.school || 'Drop location';
  return {
    ...entry,
    dateKey,
    date: entry.dateKey ? formatHistoryDate(dateKey) : entry.date,
    pickupLabel: entry.pickupLabel || 'Home',
    destinationName,
    destinationAddress: entry.destinationAddress || '',
    price: entry.price || `₹${DEFAULT_DELIVERY_FEE}`,
  };
}

export async function loadDeliveryHistory(phone: string): Promise<DeliveryHistoryEntry[]> {
  if (!phone) return [];
  try {
    const raw = await AsyncStorage.getItem(storageKey(phone));
    if (!raw) return [];
    return (JSON.parse(raw) as DeliveryHistoryEntry[]).map(hydrateHistoryEntry);
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
    const dateCompare = resolveHistoryDateKey(b).localeCompare(resolveHistoryDateKey(a));
    if (dateCompare !== 0) return dateCompare;
    if (a.status === 'In Transit' && b.status === 'Delivered') return -1;
    if (a.status === 'Delivered' && b.status === 'In Transit') return 1;
    return 0;
  });

  await saveDeliveryHistory(phone, merged);
  return merged;
}
