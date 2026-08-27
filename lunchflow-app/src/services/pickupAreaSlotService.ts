import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, deleteDoc, doc, getDocs, getDocsFromServer, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ensureAdminFirestoreAccess } from './authService';
import { PickupAreaSlot } from '../types/pickupAreaSlot';
import { matchKeywordInAddress } from '../utils/pickupAreaMatch';

const CACHE_KEY = '@lunchflow_pickup_area_slots';

export const DEFAULT_PICKUP_AREA_SLOT: PickupAreaSlot = {
  id: 'default',
  areaName: 'Default Area',
  bookingStartTime: '10:00',
  bookingEndTime: '11:45',
  matchKeywords: [],
  active: true,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

/** Only slots saved by admin should drive customer alerts and booking windows. */
export function isAdminConfiguredPickupArea(area: PickupAreaSlot): boolean {
  return area.id !== DEFAULT_PICKUP_AREA_SLOT.id;
}

function sortAreas(areas: PickupAreaSlot[]): PickupAreaSlot[] {
  return [...areas].sort((a, b) => a.sortOrder - b.sortOrder || a.areaName.localeCompare(b.areaName));
}

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase();
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

export function formatTime12Hour(time: string): string {
  const [hourPart, minutePart] = time.split(':');
  const hours = Number(hourPart);
  const minutes = Number(minutePart ?? 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function formatPickupAreaSlotLabel(area: PickupAreaSlot): string {
  return `Pickup Slot (${area.areaName}): ${formatTime12Hour(area.bookingStartTime)} – ${formatTime12Hour(area.bookingEndTime)}`;
}

export function isWithinPickupBookingWindow(area: PickupAreaSlot, now = new Date()): boolean {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const start = parseTimeToMinutes(area.bookingStartTime);
  const end = parseTimeToMinutes(area.bookingEndTime);
  return minutes >= start && minutes <= end;
}

function normalizeArea(area: PickupAreaSlot): PickupAreaSlot {
  const extraKeywords = (area.matchKeywords ?? [])
    .map(normalizeKeyword)
    .filter((keyword) => keyword && keyword !== normalizeKeyword(area.areaName));
  return {
    ...area,
    areaName: area.areaName.trim(),
    bookingStartTime: area.bookingStartTime.trim(),
    bookingEndTime: area.bookingEndTime.trim(),
    matchKeywords: extraKeywords,
    active: area.active !== false,
  };
}

function filterAdminConfiguredAreas(areas: PickupAreaSlot[]): PickupAreaSlot[] {
  return sortAreas(areas.filter(isAdminConfiguredPickupArea).map(normalizeArea));
}

function mergeAdminAreaLists(remote: PickupAreaSlot[], cached: PickupAreaSlot[]): PickupAreaSlot[] {
  const byId = new Map<string, PickupAreaSlot>();
  for (const area of cached) {
    if (isAdminConfiguredPickupArea(area)) {
      byId.set(area.id, normalizeArea(area));
    }
  }
  for (const area of remote) {
    if (isAdminConfiguredPickupArea(area)) {
      byId.set(area.id, area);
    }
  }
  return sortAreas([...byId.values()]);
}

function pickupAreaFirestoreError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: string }).code);
    if (code === 'permission-denied') {
      return 'Could not save pickup area. Please log out and sign in to admin again.';
    }
  }
  return error instanceof Error ? error.message : 'Could not save pickup area';
}

async function readCachedAreas(): Promise<PickupAreaSlot[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as PickupAreaSlot[]) : [];
  } catch {
    return [];
  }
}

async function writeCachedAreas(areas: PickupAreaSlot[]): Promise<void> {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(sortAreas(areas)));
}

function areaFromFirestore(id: string, data: Record<string, unknown>): PickupAreaSlot {
  return normalizeArea({
    id,
    areaName: String(data.areaName ?? ''),
    bookingStartTime: String(data.bookingStartTime ?? '10:00'),
    bookingEndTime: String(data.bookingEndTime ?? '11:45'),
    matchKeywords: Array.isArray(data.matchKeywords) ? data.matchKeywords.map(String) : [],
    active: data.active !== false,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : Number(data.sortOrder ?? 0),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  });
}

async function fetchAreasFromFirestore(preferServer = false): Promise<PickupAreaSlot[]> {
  const ref = collection(db, 'pickupAreaSlots');
  const snap = preferServer
    ? await getDocsFromServer(ref).catch(() => getDocs(ref))
    : await getDocs(ref);
  return snap.docs.map((entry) => areaFromFirestore(entry.id, entry.data() as Record<string, unknown>));
}

async function loadActivePickupAreas(preferServer = false): Promise<PickupAreaSlot[]> {
  try {
    const remote = await fetchAreasFromFirestore(preferServer);
    const adminAreas = filterAdminConfiguredAreas(remote);
    if (remote.length > 0) {
      await writeCachedAreas(adminAreas);
      return adminAreas.filter((area) => area.active);
    }
    const cached = filterAdminConfiguredAreas(await readCachedAreas());
    return cached.filter((area) => area.active);
  } catch {
    const cached = filterAdminConfiguredAreas(await readCachedAreas());
    return cached.filter((area) => area.active);
  }
}

export async function listPickupAreaSlots(): Promise<PickupAreaSlot[]> {
  return loadActivePickupAreas(false);
}

/** Always prefers the latest Firestore data before pickup booking checks. */
export async function listPickupAreaSlotsFresh(): Promise<PickupAreaSlot[]> {
  return loadActivePickupAreas(true);
}

export async function listAllPickupAreaSlotsAdmin(): Promise<PickupAreaSlot[]> {
  const cached = filterAdminConfiguredAreas(await readCachedAreas());
  try {
    const snap = await getDocs(collection(db, 'pickupAreaSlots'));
    const remote = snap.docs.map((entry) =>
      areaFromFirestore(entry.id, entry.data() as Record<string, unknown>),
    );
    const merged = mergeAdminAreaLists(remote, cached);
    await writeCachedAreas(merged);
    return merged;
  } catch {
    return cached;
  }
}

export function subscribeToPickupAreaSlots(onAreas: (areas: PickupAreaSlot[]) => void): () => void {
  void listPickupAreaSlots().then(onAreas);

  try {
    return onSnapshot(
      collection(db, 'pickupAreaSlots'),
      async () => {
        onAreas(await listPickupAreaSlots());
      },
      async () => {
        onAreas(await listPickupAreaSlots());
      },
    );
  } catch {
    const interval = setInterval(() => {
      void listPickupAreaSlots().then(onAreas);
    }, 8000);
    return () => clearInterval(interval);
  }
}

export function resolvePickupAreaForAddress(
  pickupAddress: string,
  areas: PickupAreaSlot[],
): PickupAreaSlot | null {
  const normalizedAddress = pickupAddress.trim().toLowerCase();
  const activeAreas = areas.filter((area) => area.active && isAdminConfiguredPickupArea(area));
  if (!normalizedAddress || activeAreas.length === 0) {
    return null;
  }

  let best: { area: PickupAreaSlot; score: number } | null = null;

  for (const area of activeAreas) {
    const keywords = [normalizeKeyword(area.areaName), ...(area.matchKeywords ?? []).map(normalizeKeyword)].filter(
      Boolean,
    );
    for (const keyword of keywords) {
      const { matched, score } = matchKeywordInAddress(normalizedAddress, keyword);
      if (!matched) continue;
      if (!best || score > best.score) {
        best = { area, score };
      }
    }
  }

  return best?.area ?? null;
}

export async function getPickupAreaForAddress(
  pickupAddress: string,
  options?: { fresh?: boolean },
): Promise<PickupAreaSlot | null> {
  const areas = options?.fresh ? await listPickupAreaSlotsFresh() : await listPickupAreaSlots();
  return resolvePickupAreaForAddress(pickupAddress, areas);
}

export async function getPickupSlotLabelForAddress(
  pickupAddress: string,
  options?: { fresh?: boolean },
): Promise<string | null> {
  const area = await getPickupAreaForAddress(pickupAddress, options);
  return area ? formatPickupAreaSlotLabel(area) : null;
}

export function createPickupAreaId(areaName: string): string {
  const slug = areaName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `area-${Date.now()}`;
}

export async function savePickupAreaSlot(
  input: Omit<PickupAreaSlot, 'createdAt' | 'updatedAt'> & { createdAt?: string },
): Promise<PickupAreaSlot> {
  const now = new Date().toISOString();
  const record = normalizeArea({
    ...input,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  });

  const cached = await readCachedAreas();
  const next = cached.some((area) => area.id === record.id)
    ? cached.map((area) => (area.id === record.id ? record : area))
    : [record, ...cached];
  await writeCachedAreas(next);

  await ensureAdminFirestoreAccess();
  try {
    await setDoc(doc(db, 'pickupAreaSlots', record.id), record, { merge: true });
  } catch (error) {
    throw new Error(pickupAreaFirestoreError(error));
  }

  return record;
}

export async function deletePickupAreaSlot(id: string): Promise<void> {
  if (id === DEFAULT_PICKUP_AREA_SLOT.id) return;
  const cached = await readCachedAreas();
  await writeCachedAreas(cached.filter((area) => area.id !== id));
  await ensureAdminFirestoreAccess();
  try {
    await deleteDoc(doc(db, 'pickupAreaSlots', id));
  } catch (error) {
    throw new Error(pickupAreaFirestoreError(error));
  }
}

export function isPickupSlotAlertMessage(message: string, areas: PickupAreaSlot[]): boolean {
  return areas
    .filter(isAdminConfiguredPickupArea)
    .some((area) => message === formatPickupAreaSlotLabel(area));
}
