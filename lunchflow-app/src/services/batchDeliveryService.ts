import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeliveryBatch } from '../types/batch';
import { DeliveryOrder } from '../types/delivery';
import { syncDocument } from './firestoreSync';

const BATCHES_KEY = '@lunchflow_delivery_batches';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function batchStorageKey(date = todayKey()): string {
  return `${BATCHES_KEY}_${date}`;
}

function normalizeSchoolKey(order: DeliveryOrder): string {
  return `${order.deliveryType}::${(order.dropAddress || order.school).trim().toLowerCase()}`;
}

export async function loadBatchesForToday(): Promise<DeliveryBatch[]> {
  try {
    const raw = await AsyncStorage.getItem(batchStorageKey());
    return raw ? (JSON.parse(raw) as DeliveryBatch[]) : [];
  } catch {
    return [];
  }
}

async function saveBatches(batches: DeliveryBatch[]): Promise<void> {
  await AsyncStorage.setItem(batchStorageKey(), JSON.stringify(batches));
  for (const batch of batches) {
    await syncDocument('delivery_batches', batch.id, batch);
  }
}

export async function buildSchoolBatches(orders: DeliveryOrder[]): Promise<DeliveryBatch[]> {
  const eligible = orders.filter(
    (o) =>
      o.status !== 'delivered' &&
      o.status !== 'booked' &&
      normalizeDeliveryTypeSchool(o),
  );

  const groups = new Map<string, DeliveryOrder[]>();
  for (const order of eligible) {
    const key = normalizeSchoolKey(order);
    const list = groups.get(key) ?? [];
    list.push(order);
    groups.set(key, list);
  }

  const existing = await loadBatchesForToday();
  const batches: DeliveryBatch[] = [];

  for (const [key, groupOrders] of groups.entries()) {
    if (groupOrders.length === 0) continue;
    const sample = groupOrders[0];
    const existingBatch = existing.find((b) => b.school.toLowerCase() === sample.school.toLowerCase());
    const batch: DeliveryBatch = existingBatch ?? {
      id: `BATCH-${key.replace(/[^a-z0-9]/gi, '').slice(0, 12)}-${Date.now().toString().slice(-4)}`,
      school: sample.school,
      dropAddress: sample.dropAddress || sample.school,
      deliveryType: sample.deliveryType,
      orderIds: [],
      status: 'pending',
      createdAt: new Date().toISOString(),
      date: todayKey(),
    };

    batch.orderIds = Array.from(new Set([...batch.orderIds, ...groupOrders.map((o) => o.id)]));
    const driverOrder = groupOrders.find((o) => o.driver);
    if (driverOrder?.driver) {
      batch.driverId = driverOrder.driver.id;
      batch.driverName = driverOrder.driver.name;
      batch.status = groupOrders.every((o) => o.status === 'delivered') ? 'delivered' : 'in_transit';
    }
    batches.push(batch);
  }

  await saveBatches(batches);
  return batches;
}

function normalizeDeliveryTypeSchool(order: DeliveryOrder): boolean {
  return order.deliveryType === 'school' || order.deliveryType === 'college' || order.deliveryType === 'office';
}

export async function getBatchForOrder(orderId: string): Promise<DeliveryBatch | null> {
  const batches = await loadBatchesForToday();
  return batches.find((b) => b.orderIds.includes(orderId)) ?? null;
}

export async function markBatchDelivered(batchId: string): Promise<DeliveryBatch | null> {
  const batches = await loadBatchesForToday();
  const batch = batches.find((b) => b.id === batchId);
  if (!batch) return null;

  const updated: DeliveryBatch = {
    ...batch,
    status: 'delivered',
    deliveredAt: new Date().toISOString(),
  };

  const next = batches.map((b) => (b.id === batchId ? updated : b));
  await saveBatches(next);
  return updated;
}

export async function listDriverBatches(driverId: string): Promise<DeliveryBatch[]> {
  const batches = await loadBatchesForToday();
  return batches.filter((b) => b.driverId === driverId && b.status !== 'delivered');
}
