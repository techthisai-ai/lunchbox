import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type DeliverySlot = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
  active: boolean;
};

const CACHE_KEY = '@lunchflow_delivery_slots';

export const DEFAULT_DELIVERY_SLOTS: DeliverySlot[] = [
  { id: 'morning', label: 'Morning (10:30–11:30)', startTime: '10:30', endTime: '11:30', capacity: 50, booked: 0, active: true },
  { id: 'midday', label: 'Midday (11:30–12:30)', startTime: '11:30', endTime: '12:30', capacity: 80, booked: 0, active: true },
  { id: 'afternoon', label: 'Afternoon (12:30–13:30)', startTime: '12:30', endTime: '13:30', capacity: 60, booked: 0, active: true },
];

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export async function loadDeliverySlots(): Promise<DeliverySlot[]> {
  try {
    const snap = await getDocs(collection(db, 'deliverySlots'));
    if (!snap.empty) {
      const slots = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DeliverySlot, 'id'>) }));
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(slots));
      return slots.filter((s) => s.active);
    }

    await Promise.all(DEFAULT_DELIVERY_SLOTS.map((slot) => saveDeliverySlot(slot)));
    return DEFAULT_DELIVERY_SLOTS;
  } catch {
    // Fall back to cache/defaults.
  }

  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) return (JSON.parse(cached) as DeliverySlot[]).filter((s) => s.active);
  } catch {
    // Ignore.
  }

  return DEFAULT_DELIVERY_SLOTS;
}

export async function saveDeliverySlot(slot: DeliverySlot): Promise<void> {
  await setDoc(doc(db, 'deliverySlots', slot.id), slot, { merge: true });
  const slots = await loadDeliverySlots();
  const next = slots.some((s) => s.id === slot.id)
    ? slots.map((s) => (s.id === slot.id ? slot : s))
    : [...slots, slot];
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next));
}

export async function pickAvailableSlot(preferredId?: string): Promise<DeliverySlot> {
  const slots = await loadDeliverySlots();
  if (preferredId) {
    const preferred = slots.find((s) => s.id === preferredId && s.booked < s.capacity);
    if (preferred) return preferred;
  }

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const upcoming = slots
    .filter((s) => s.booked < s.capacity)
    .sort((a, b) => parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime));

  const nextSlot = upcoming.find((s) => parseTimeToMinutes(s.startTime) >= nowMinutes) ?? upcoming[0];
  if (!nextSlot) {
    return DEFAULT_DELIVERY_SLOTS[1];
  }
  return nextSlot;
}

export async function reserveDeliverySlot(slotId: string): Promise<void> {
  try {
    const ref = doc(db, 'deliverySlots', slotId);
    const snap = await getDoc(ref);
    const current = snap.exists() ? (snap.data() as DeliverySlot) : DEFAULT_DELIVERY_SLOTS.find((s) => s.id === slotId);
    if (!current) return;
    const booked = (current.booked ?? 0) + 1;
    await updateDoc(ref, { booked });
  } catch {
    // Best-effort capacity tracking.
  }
}

export function getSlotLabel(slotId: string | undefined, slots: DeliverySlot[]): string {
  if (!slotId) return 'Standard slot';
  return slots.find((s) => s.id === slotId)?.label ?? slotId;
}
