import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { TimelineStep } from '../components/Timeline';
import { db } from '../lib/firebase';
import { decodeRestDocument, isMobileWebBrowser, runFirestoreQuery } from '../lib/firestoreRest';
import { getInitials, normalizePhone } from '../constants/auth';
import { DEMO_DROP, DEMO_PICKUP } from '../constants/maps';
import {
  DeliveryDriver,
  DeliveryOrder,
  DeliveryProfile,
  DeliveryStatus,
  DriverLocation,
  FoodReadyDetails,
  GeoPoint,
  RoutePlan,
  formatStudentDisplayName,
  formatStudentDropAddresses,
  buildFoodReadyStudents,
  foodReadyStudentsToLegacy,
  getDropAddress,
  normalizeDeliveryType,
  normalizeDeliveryTypes,
} from '../types/delivery';
import {
  CustomerRegistration,
  loadCustomerRegistration,
  loadRegisteredDrivers,
  incrementDriverCompletedDeliveries,
  updateCustomerRegistration,
} from './userRegistryService';
import { loadSubscriptionPaymentSnapshot, markSubscriptionCodCollected } from './subscriptionService';
import { getDriverRatingSummary } from './ratingService';
import {
  geocodeAddressAsync,
  interpolatePoint,
  driverProgressForStatus,
  isRecentGpsLocation,
  estimateTravelMinutes,
  resolveMapPoint,
  resolveOrderLocationsAsync,
  isTrustedMapPoint,
} from './mapGeocoding';
import { getEtaDestination } from '../utils/deliveryEta';
import { pickAvailableSlot, reserveDeliverySlot } from './deliverySlotService';
import { emitOrderChange } from './orderSync';
import { PICKUP_READY_TIMEOUT_MINUTES } from '../constants/business';
import { buildSchoolBatches, markBatchDelivered as closeBatchRecord } from './batchDeliveryService';
import { logDeliveryConfirmation } from './deliveryLogService';
import { updateFoodReadyDefaultsPickupAddress } from './foodReadyDefaultsService';
import { clearPickupSlotBannerSession } from '../utils/pickupSlotBanner';

const ORDERS_INDEX_KEY = '@lunchflow_orders_index';

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function orderStatusRank(status: DeliveryOrder['status']): number {
  switch (status) {
    case 'booked':
      return 1;
    case 'food_ready':
      return 2;
    case 'awaiting_driver':
      return 3;
    case 'driver_assigned':
      return 4;
    case 'at_pickup':
      return 5;
    case 'pickup_verified':
      return 6;
    case 'picked_up':
      return 7;
    case 'in_transit':
      return 8;
    case 'at_drop':
      return 9;
    case 'delivered':
      return 10;
    case 'pickup_closed':
      return 0;
    default:
      return 0;
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function addMinutes(minutes: number): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return formatTime(date);
}

function addMinutesIso(minutes: number): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function applyEta(
  order: DeliveryOrder,
  etaMinutes: number,
): Pick<DeliveryOrder, 'driver' | 'estimatedArrival' | 'estimatedArrivalAtIso'> {
  const eta = Math.max(0, etaMinutes);
  const arrivalAt = new Date(Date.now() + eta * 60_000);
  return {
    driver: order.driver ? { ...order.driver, etaMinutes: eta } : null,
    estimatedArrival: formatTime(arrivalAt),
    estimatedArrivalAtIso: arrivalAt.toISOString(),
  };
}

function orderStorageKey(orderId: string): string {
  return `@lunchflow_order_${orderId}`;
}

function generateOrderId(): string {
  const now = new Date();
  return `LF-${now.getFullYear()}-${now.getTime().toString().slice(-4)}`;
}

function generatePickupOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function generateQrCode(studentName: string, orderId: string): string {
  const initials = studentName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
  return `LF-${initials || 'BOX'}-${orderId.slice(-4)}`;
}

async function readIndex(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(ORDERS_INDEX_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function writeIndex(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(ORDERS_INDEX_KEY, JSON.stringify(ids));
}

async function saveOrderLocal(order: DeliveryOrder): Promise<void> {
  await AsyncStorage.setItem(orderStorageKey(order.id), JSON.stringify(order));
  const index = await readIndex();
  if (!index.includes(order.id)) {
    await writeIndex([order.id, ...index]);
  }
}

async function loadOrderLocal(orderId: string): Promise<DeliveryOrder | null> {
  try {
    const raw = await AsyncStorage.getItem(orderStorageKey(orderId));
    return raw ? (JSON.parse(raw) as DeliveryOrder) : null;
  } catch {
    return null;
  }
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T;
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefinedDeep(entry)]),
    ) as T;
  }
  return value;
}

function asRemoteOrder(data: Record<string, unknown>, docId: string): DeliveryOrder {
  const raw = data as unknown as DeliveryOrder;
  const driver = raw.driver && typeof raw.driver === 'object' && raw.driver.id ? raw.driver : null;
  return {
    ...raw,
    id: String(raw.id || docId),
    driver,
    assignedDriverPhone: raw.assignedDriverPhone || driver?.phone,
    amountPaid: typeof raw.amountPaid === 'number' ? raw.amountPaid : undefined,
    amount_due: typeof raw.amount_due === 'number' ? raw.amount_due : undefined,
    paymentMethod: raw.paymentMethod?.trim() || undefined,
    payment_method: raw.payment_method,
    payment_status: raw.payment_status,
    transaction_id: raw.transaction_id ?? undefined,
    cash_collected_at: raw.cash_collected_at ?? undefined,
    cash_collected_by: raw.cash_collected_by ?? undefined,
  };
}

async function persistOrder(order: DeliveryOrder): Promise<void> {
  const payload = stripUndefinedDeep({ ...order, updatedAt: new Date().toISOString() });
  await saveOrderLocal(payload);

  let remoteSaved = false;
  for (let attempt = 0; attempt < 2 && !remoteSaved; attempt += 1) {
    try {
      await setDoc(doc(db, 'orders', order.id), payload, { merge: true });
      remoteSaved = true;
    } catch {
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }
  }

  emitOrderChange();
}

async function loadOrder(orderId: string): Promise<DeliveryOrder | null> {
  await syncFromFirestore();
  return loadOrderById(orderId);
}

async function loadOrderById(orderId: string): Promise<DeliveryOrder | null> {
  const local = await loadOrderLocal(orderId);
  if (local) return hydrateOrderLocations(local);
  try {
    const snap = await getDoc(doc(db, 'orders', orderId));
    if (!snap.exists()) return null;
    const remote = asRemoteOrder(snap.data() as Record<string, unknown>, snap.id);
    await stashOrderFromRemote(remote);
    return hydrateOrderLocations((await loadOrderLocal(orderId)) ?? remote);
  } catch {
    return null;
  }
}

function phoneMatches(orderPhone: string, phone: string): boolean {
  return normalizePhone(orderPhone) === normalizePhone(phone);
}

function resolveOrderLocations(order: Pick<DeliveryOrder, 'pickupAddress' | 'dropAddress' | 'school' | 'pickupLocation' | 'dropLocation'>): {
  pickupLocation: GeoPoint;
  dropLocation: GeoPoint;
} {
  return {
    pickupLocation: resolveMapPoint(order.pickupLocation, order.pickupAddress, DEMO_PICKUP),
    dropLocation: resolveMapPoint(order.dropLocation, getDropAddress(order), DEMO_DROP),
  };
}

function withLocations(order: DeliveryOrder): DeliveryOrder {
  return {
    ...order,
    pickupLocation: resolveMapPoint(order.pickupLocation, order.pickupAddress, DEMO_PICKUP),
    dropLocation: resolveMapPoint(order.dropLocation, getDropAddress(order), DEMO_DROP),
  };
}

function mergeOrderState(local: DeliveryOrder | null, remote: DeliveryOrder): DeliveryOrder {
  const hydratedRemote = withLocations(remote);
  if (!local) return hydratedRemote;

  const hydratedLocal = withLocations(local);

  if (hydratedLocal.status === 'pickup_closed' && hydratedRemote.status !== 'pickup_closed') {
    return {
      ...hydratedRemote,
      status: 'pickup_closed',
      pickupClosedAt: hydratedLocal.pickupClosedAt ?? hydratedRemote.pickupClosedAt,
      driver: null,
    };
  }

  if (hydratedLocal.status === 'delivered' && hydratedRemote.status !== 'delivered') {
    return { ...hydratedRemote, ...hydratedLocal, status: 'delivered' };
  }

  if (hydratedRemote.status === 'pickup_closed' || hydratedRemote.status === 'delivered') {
    return hydratedRemote;
  }

  const localUpdated = (local as DeliveryOrder & { updatedAt?: string }).updatedAt;
  const remoteUpdated = (remote as DeliveryOrder & { updatedAt?: string }).updatedAt;
  const localTime = localUpdated ? Date.parse(localUpdated) : 0;
  const remoteTime = remoteUpdated ? Date.parse(remoteUpdated) : 0;
  if (localTime > remoteTime) return hydratedLocal;
  return hydratedRemote;
}

async function stashOrderFromRemote(remote: DeliveryOrder): Promise<DeliveryOrder> {
  const local = await loadOrderLocal(remote.id);
  const merged = mergeOrderState(local, remote);
  await saveOrderLocal(merged);

  if (local && merged.status === 'pickup_closed' && remote.status !== 'pickup_closed') {
    await persistOrder(merged);
  }

  return merged;
}

async function hydrateOrderLocations(order: DeliveryOrder): Promise<DeliveryOrder> {
  const pickupAddress = order.pickupAddress?.trim() ?? '';
  const dropAddress = getDropAddress(order)?.trim() ?? '';
  const pickupTrusted = isTrustedMapPoint(order.pickupLocation, pickupAddress);
  const dropTrusted = isTrustedMapPoint(order.dropLocation, dropAddress);

  if (pickupTrusted && dropTrusted && order.pickupLocation && order.dropLocation) {
    return withLocations(order);
  }

  const locations = await resolveOrderLocationsAsync(order);
  const updated: DeliveryOrder = {
    ...order,
    pickupLocation: locations.pickupLocation,
    dropLocation: locations.dropLocation,
  };
  await persistOrder(updated);
  return updated;
}

function computeDriverLocation(order: DeliveryOrder): DriverLocation | null {
  if (!order.driver) return null;
  if (order.driverLocation && isRecentGpsLocation(order.driverLocation.updatedAt)) {
    return order.driverLocation;
  }
  const pickup = resolveMapPoint(order.pickupLocation, order.pickupAddress, DEMO_PICKUP);
  const drop = order.dropLocation ?? resolveOrderLocations(order).dropLocation;
  const progress = driverProgressForStatus(order.status);
  const point = interpolatePoint(pickup, drop, progress);
  return {
    ...point,
    updatedAt: new Date().toISOString(),
  };
}

export async function updateDriverLocation(orderId: string, location: GeoPoint): Promise<DeliveryOrder> {
  const order = await loadOrder(orderId);
  if (!order) throw new Error('Order not found');

  const driverLocation: DriverLocation = { ...location, updatedAt: new Date().toISOString() };
  const withLocation = { ...order, driverLocation };
  const destination = getEtaDestination(withLocation);

  let updated: DeliveryOrder = { ...order, driverLocation };
  if (destination && order.driver) {
    const etaMinutes = estimateTravelMinutes(location, destination);
    updated = { ...updated, ...applyEta(withLocation, etaMinutes) };
  }

  await persistOrder(updated);
  return updated;
}

export async function syncDriverLocationForOrder(orderId: string): Promise<DeliveryOrder> {
  const order = await loadOrder(orderId);
  if (!order || !order.driver) return order!;
  if (order.driverLocation && isRecentGpsLocation(order.driverLocation.updatedAt)) {
    return order;
  }
  const driverLocation = computeDriverLocation(order);
  const updated = { ...order, driverLocation };
  await persistOrder(updated);
  return updated;
}

export async function listOrdersByDateRange(startDate: string, endDate: string): Promise<DeliveryOrder[]> {
  await syncFromFirestore();
  const results: DeliveryOrder[] = [];
  try {
    const q = query(collection(db, 'orders'), where('date', '>=', startDate), where('date', '<=', endDate));
    const snap = await getDocs(q);
    for (const docSnap of snap.docs) {
      const order = withLocations(asRemoteOrder(docSnap.data() as Record<string, unknown>, docSnap.id));
      await saveOrderLocal(order);
      results.push(order);
    }
    if (results.length > 0) {
      return results.sort((a, b) => (b.bookedAt ?? '').localeCompare(a.bookedAt ?? ''));
    }
  } catch {
    // Fall back to local cache below.
  }

  const local = await loadAllOrdersLocal();
  return local
    .filter((o) => o.date >= startDate && o.date <= endDate)
    .sort((a, b) => (b.bookedAt ?? '').localeCompare(a.bookedAt ?? ''));
}

export function listActiveFleetOrders(orders: DeliveryOrder[]): DeliveryOrder[] {
  return orders.filter(
    (o) =>
      o.driver &&
      !['delivered', 'booked', 'pickup_closed', 'awaiting_driver', 'food_ready'].includes(o.status),
  );
}

/** Unique drivers currently on accepted pickups/deliveries for the admin live map. */
export function listLiveFleetDrivers(orders: DeliveryOrder[]): Array<{
  driverId: string;
  name: string;
  location: GeoPoint | null;
  orderCount: number;
  status: DeliveryStatus;
}> {
  const byDriver = new Map<
    string,
    { driverId: string; name: string; location: GeoPoint | null; orderCount: number; status: DeliveryStatus }
  >();

  for (const order of listActiveFleetOrders(orders)) {
    const driverId = order.driver?.id;
    if (!driverId) continue;
    const existing = byDriver.get(driverId);
    const gps =
      order.driverLocation &&
      Number.isFinite(order.driverLocation.lat) &&
      Number.isFinite(order.driverLocation.lng)
        ? order.driverLocation
        : null;
    const location = gps ?? existing?.location ?? null;

    byDriver.set(driverId, {
      driverId,
      name: order.driver?.name ?? 'Driver',
      location,
      orderCount: (existing?.orderCount ?? 0) + 1,
      status: order.status,
    });
  }

  return Array.from(byDriver.values());
}

export function subscribeToOrder(orderId: string, onOrder: (order: DeliveryOrder | null) => void): () => void {
  return onSnapshot(
    doc(db, 'orders', orderId),
    async (snap) => {
      if (!snap.exists()) {
        onOrder(null);
        return;
      }
      const order = await stashOrderFromRemote(asRemoteOrder(snap.data() as Record<string, unknown>, snap.id));
      onOrder(order);
    },
    () => onOrder(null),
  );
}

export function subscribeToCustomerOrderToday(
  phone: string,
  onOrder: (order: DeliveryOrder | null) => void,
): () => void {
  const normalized = normalizePhone(phone);
  const q = query(
    collection(db, 'orders'),
    where('date', '==', todayKey()),
    where('customerPhone', '==', normalized),
  );

  return onSnapshot(
    q,
    async (snap) => {
      if (snap.empty) {
        const local = await getCustomerOrderToday(normalized);
        onOrder(local);
        return;
      }
      const order = await stashOrderFromRemote(
        asRemoteOrder(snap.docs[0].data() as Record<string, unknown>, snap.docs[0].id),
      );
      onOrder(order);
    },
    async () => {
      const local = await getCustomerOrderToday(normalized);
      onOrder(local);
    },
  );
}

function sortOrdersByBookedDesc(orders: DeliveryOrder[]): DeliveryOrder[] {
  return [...orders].sort((a, b) => (b.bookedAt ?? '').localeCompare(a.bookedAt ?? ''));
}

async function publishTodayOrders(onOrders: (orders: DeliveryOrder[]) => void): Promise<void> {
  await processExpiredPickupOrders();
  const orders = sortOrdersByBookedDesc((await loadAllOrdersLocal()).map(withLocations));
  onOrders(orders);
}

export function subscribeToAllOrdersToday(onOrders: (orders: DeliveryOrder[]) => void): () => void {
  let cancelled = false;
  let retryTimer: ReturnType<typeof setInterval> | null = null;

  const publish = async () => {
    if (cancelled) return;
    await publishTodayOrders(onOrders);
  };

  void syncFromFirestore().then(publish);

  retryTimer = setInterval(() => {
    void syncFromFirestore().then(publish);
  }, 5000);

  const q = query(collection(db, 'orders'), where('date', '==', todayKey()));
  const unsub = onSnapshot(
    q,
    async (snap) => {
      for (const docSnap of snap.docs) {
        await stashOrderFromRemote(asRemoteOrder(docSnap.data() as Record<string, unknown>, docSnap.id));
      }
      await publish();
      if (retryTimer) {
        clearInterval(retryTimer);
        retryTimer = null;
      }
    },
    async () => {
      await syncFromFirestore();
      await publish();
    },
  );

  return () => {
    cancelled = true;
    if (retryTimer) clearInterval(retryTimer);
    unsub();
  };
}

async function loadAllOrdersLocal(): Promise<DeliveryOrder[]> {
  const ids = await readIndex();
  const orders = await Promise.all(ids.map((id) => loadOrderLocal(id)));
  return orders.filter((o): o is DeliveryOrder => Boolean(o && o.date === todayKey()));
}

async function fetchTodayOrdersViaRest(): Promise<DeliveryOrder[]> {
  const documents = await runFirestoreQuery('orders', 'date', todayKey());
  return documents.map((document) => {
    const id = document.name.split('/').pop() ?? '';
    const decoded = decodeRestDocument<Record<string, unknown>>(document);
    return asRemoteOrder(decoded, id);
  });
}

async function pullTodayOrdersFromRemote(): Promise<void> {
  if (isMobileWebBrowser()) {
    const orders = await fetchTodayOrdersViaRest();
    for (const order of orders) {
      await stashOrderFromRemote(order);
    }
    return;
  }

  const q = query(collection(db, 'orders'), where('date', '==', todayKey()));
  const snap = await getDocs(q);
  for (const docSnap of snap.docs) {
    await stashOrderFromRemote(asRemoteOrder(docSnap.data() as Record<string, unknown>, docSnap.id));
  }
}

async function syncFromFirestore(): Promise<void> {
  try {
    await pullTodayOrdersFromRemote();
  } catch {
    try {
      const orders = await fetchTodayOrdersViaRest();
      for (const order of orders) {
        await stashOrderFromRemote(order);
      }
    } catch {
      // Local cache remains the fallback.
    }
  }
}

export async function loadCustomerProfile(phone: string): Promise<DeliveryProfile> {
  const registration = await loadCustomerRegistration(phone);
  if (registration) {
    return {
      name: registration.name,
      studentName: registration.studentName,
      school: registration.school,
      address: registration.address,
      addressLocation: registration.addressLocation ?? null,
      deliveryType: normalizeDeliveryType(registration.registrationType),
    };
  }

  return {
    name: 'Customer',
    studentName: 'Student',
    school: 'School',
    address: 'Home',
  };
}

export function planRoute(orders: DeliveryOrder[]): RoutePlan {
  const pickups = sortPickupsByNearestNeighbor(orders);
  const stops = [
    ...pickups.map((order, index) => ({
      orderId: order.id,
      type: 'pickup' as const,
      address: order.pickupAddress,
      label: order.customerName,
      sequence: index + 1,
    })),
    ...pickups.map((order, index) => ({
      orderId: order.id,
      type: 'drop' as const,
      address: getDropAddress(order),
      label: getDropAddress(order),
      sequence: pickups.length + index + 1,
    })),
  ];

  return {
    stops,
    totalStops: stops.length,
    etaMinutes: pickups.length * 8 + pickups.length * 12,
    plannedAt: formatTime(new Date()),
  };
}

function distanceBetween(a: GeoPoint, b: GeoPoint): number {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function sortPickupsByNearestNeighbor(orders: DeliveryOrder[]): DeliveryOrder[] {
  if (orders.length <= 1) return [...orders];

  const remaining = [...orders].sort((a, b) => (a.foodReadyAt ?? '').localeCompare(b.foodReadyAt ?? ''));
  const sorted: DeliveryOrder[] = [];
  const first = remaining.shift()!;
  sorted.push(first);
  let cursor = first.pickupLocation ?? resolveOrderLocations(first).pickupLocation;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remaining.length; i += 1) {
      const pickup = remaining[i].pickupLocation ?? resolveOrderLocations(remaining[i]).pickupLocation;
      const dist = distanceBetween(cursor, pickup);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    const next = remaining.splice(nearestIdx, 1)[0];
    sorted.push(next);
    cursor = next.pickupLocation ?? resolveOrderLocations(next).pickupLocation;
  }

  return sorted;
}

export async function createBooking(
  customerId: string,
  phone: string,
  profile: DeliveryProfile,
): Promise<DeliveryOrder> {
  const normalizedPhone = normalizePhone(phone);
  const existing = await getCustomerOrderToday(normalizedPhone);
  if (existing && existing.status !== 'delivered' && existing.status !== 'pickup_closed') return existing;

  const now = new Date();
  const id = generateOrderId();
  const slot = await pickAvailableSlot();
  const locations = await resolveOrderLocationsAsync({
    pickupAddress: profile.address,
    dropAddress: profile.school,
    school: profile.school,
    pickupLocation: profile.addressLocation ?? null,
    dropLocation: null,
    customerPickupLocation: profile.addressLocation ?? null,
  });
  const payment = await loadSubscriptionPaymentSnapshot(normalizedPhone);
  const order: DeliveryOrder = {
    id,
    customerId,
    customerPhone: normalizedPhone,
    customerName: profile.name,
    status: 'booked',
    studentName: profile.studentName,
    school: profile.school,
    deliveryType: profile.deliveryType ?? 'school',
    pickupAddress: profile.address,
    dropAddress: profile.school,
    deliverySlotId: slot.id,
    deliverySlotLabel: slot.label,
    estimatedArrival: null,
    bookedAt: formatTime(now),
    foodReadyAt: null,
    pickupVerifiedAt: null,
    pickedUpAt: null,
    deliveredAt: null,
    pickupOtp: generatePickupOtp(),
    qrCode: generateQrCode(profile.studentName, id),
    pickupLocation: locations.pickupLocation,
    dropLocation: locations.dropLocation,
    driverLocation: null,
    driver: null,
    routePlan: null,
    date: todayKey(),
    amountPaid: payment?.payment_status === 'PAID' || payment?.payment_status === 'COLLECTED_COD'
      ? payment.amountPaid
      : payment?.payment_status === 'PENDING_COD'
        ? 0
        : payment?.amountPaid,
    amount_due:
      payment?.payment_status === 'PENDING_COD'
        ? (payment.amount_due ?? payment.amountPaid)
        : undefined,
    paymentMethod: payment?.paymentMethod,
    payment_method: payment?.payment_method,
    payment_status: payment?.payment_status,
    transaction_id: payment?.transaction_id,
  };

  await persistOrder(order);
  await reserveDeliverySlot(slot.id);
  return order;
}

export async function markFoodReady(phone: string, details?: FoodReadyDetails): Promise<DeliveryOrder> {
  let order = await getCustomerOrderToday(phone);

  if (!order) {
    const profile = await loadCustomerProfile(phone);
    order = await createBooking('unknown', phone, profile);
  }

  if (order.status !== 'booked' && order.status !== 'food_ready' && order.status !== 'awaiting_driver') {
    if (order.status === 'delivered') {
      throw new Error('Today\'s delivery is already completed');
    }
    if (order.status === 'pickup_closed') {
      throw new Error('This delivery was cancelled');
    }
    return order;
  }

  const filledStudents = details?.students?.filter((entry) => entry.name.trim()) ?? [];
  const personName =
    (filledStudents.length ? formatStudentDisplayName(filledStudents) : null) ||
    (details?.persons?.map((entry) => entry.trim()).filter(Boolean).join(', ') || details?.person?.trim()) ||
    order.studentName;
  const customerName = details?.name?.trim() || order.customerName;
  const pickupAddress = details?.pickupAddress?.trim() || order.pickupAddress;
  const dropAddress =
    (filledStudents.length ? formatStudentDropAddresses(filledStudents) : null) ||
    details?.dropAddress?.trim() ||
    order.dropAddress ||
    order.school;
  const deliveryTypes = normalizeDeliveryTypes(
    details?.deliveryTypes ?? filledStudents.map((entry) => entry.deliveryType),
    normalizeDeliveryType(details?.deliveryType ?? order.deliveryType),
  );
  const deliveryType = deliveryTypes[0] ?? normalizeDeliveryType(details?.deliveryType ?? order.deliveryType);
  const primaryDrop = filledStudents[0]?.dropLocation.trim() || dropAddress;
  const profile = await loadCustomerProfile(phone);
  const locations = await resolveOrderLocationsAsync({
    pickupAddress,
    dropAddress: primaryDrop,
    school: primaryDrop,
    pickupLocation: order.pickupLocation,
    dropLocation: order.dropLocation,
    customerPickupLocation: profile.addressLocation ?? null,
  });

  const nowIso = new Date().toISOString();
  const updated: DeliveryOrder = {
    ...order,
    status: 'awaiting_driver',
    deliveryType,
    deliveryTypes,
    customerName,
    studentName: personName,
    school: dropAddress,
    pickupAddress,
    dropAddress,
    pickupLocation: locations.pickupLocation,
    dropLocation: locations.dropLocation,
    foodReadyAt: order.foodReadyAt ?? formatTime(new Date()),
    pickupOtp: order.pickupOtp || generatePickupOtp(),
    qrCode: order.qrCode || generateQrCode(personName, order.id),
    pickupReadyAtIso: nowIso,
    pickupExpiresAtIso: addMinutesIso(PICKUP_READY_TIMEOUT_MINUTES),
    studentEntries: filledStudents.length ? filledStudents : order.studentEntries,
  };

  await persistOrder(updated);
  return updated;
}

export async function getCustomerOrderToday(phone: string): Promise<DeliveryOrder | null> {
  await syncFromFirestore();
  const orders = await loadAllOrdersLocal();
  const mine = orders.filter((o) => phoneMatches(o.customerPhone, phone));
  if (mine.length === 0) return null;

  // Prefer the furthest-along active order so home does not flip between a
  // newly auto-created "booked" row and an existing "food_ready" trip.
  const active = mine
    .filter((o) => o.status !== 'delivered' && o.status !== 'pickup_closed')
    .sort((a, b) => {
      const rankDiff = orderStatusRank(b.status) - orderStatusRank(a.status);
      if (rankDiff !== 0) return rankDiff;
      return (b.bookedAt ?? '').localeCompare(a.bookedAt ?? '');
    })[0];
  if (active) return active;

  const delivered = mine.find((o) => o.status === 'delivered');
  if (delivered) return delivered;

  return sortOrdersByBookedDesc(mine)[0] ?? null;
}

export async function updateCustomerHomeAddress(
  phone: string,
  homeAddress: string,
  addressLocation?: GeoPoint | null,
  contactName?: string,
  pickupContactPhone?: string,
): Promise<void> {
  const trimmed = homeAddress.trim();
  if (!trimmed) throw new Error('Enter your home address');

  const registrationFields: Partial<CustomerRegistration> = { address: trimmed };
  if (addressLocation !== undefined) {
    registrationFields.addressLocation = addressLocation;
  }
  if (contactName != null) {
    const trimmedName = contactName.trim();
    if (!trimmedName) throw new Error('Enter contact name');
    registrationFields.name = trimmedName;
  }
  if (pickupContactPhone != null) {
    const normalizedContact = normalizePhone(pickupContactPhone);
    if (normalizedContact.length !== 10) {
      throw new Error('Enter a valid 10-digit pickup contact number');
    }
    registrationFields.pickupContactPhone = normalizedContact;
  }

  await updateCustomerRegistration(phone, registrationFields);
  await clearPickupSlotBannerSession(phone);
  await updateFoodReadyDefaultsPickupAddress(phone, trimmed);

  const order = await getCustomerOrderToday(phone);
  if (!order) return;

  const locations = await resolveOrderLocationsAsync({
    pickupAddress: trimmed,
    dropAddress: getDropAddress(order),
    school: order.school,
    pickupLocation: addressLocation ?? order.pickupLocation,
    dropLocation: order.dropLocation,
    customerPickupLocation: addressLocation ?? null,
  });

  await persistOrder({
    ...order,
    pickupAddress: trimmed,
    pickupLocation: locations.pickupLocation,
  });
}

export async function updateCustomerDeliveryAddress(
  phone: string,
  index: number,
  fields: { name?: string; dropLocation?: string; classSection?: string },
): Promise<void> {
  const registration = await loadCustomerRegistration(phone);
  if (!registration) throw new Error('Customer registration not found');

  const order = await getCustomerOrderToday(phone);
  const profile = await loadCustomerProfile(phone);

  if (order) {
    const students = buildFoodReadyStudents({
      studentEntries: order.studentEntries,
      students: order.studentEntries,
      person: order.studentName || profile.studentName,
      dropAddress: getDropAddress(order),
      deliveryType: order.deliveryType,
      deliveryTypes: order.deliveryTypes,
    });

    if (!students[index]) throw new Error('Delivery address not found');

    students[index] = {
      ...students[index],
      name: fields.name?.trim() ?? students[index].name,
      dropLocation: fields.dropLocation?.trim() ?? students[index].dropLocation,
      classSection: fields.classSection?.trim() ?? students[index].classSection,
    };

    const legacy = foodReadyStudentsToLegacy(students);
    const dropAddress = formatStudentDropAddresses(students) || students[0]?.dropLocation || order.dropAddress;
    const primary = students[0];

    const locations = await resolveOrderLocationsAsync({
      pickupAddress: order.pickupAddress,
      dropAddress,
      school: dropAddress,
      pickupLocation: order.pickupLocation,
      dropLocation: null,
    });

    await persistOrder({
      ...order,
      studentEntries: students,
      studentName: legacy.person,
      dropAddress,
      school: dropAddress,
      dropLocation: locations.dropLocation,
    });

    await updateCustomerRegistration(phone, {
      school: primary?.dropLocation?.trim() || registration.school,
      studentName: primary?.name?.trim() || registration.studentName,
      classSection: primary?.classSection?.trim() || registration.classSection,
    });
    return;
  }

  await updateCustomerRegistration(phone, {
    school: fields.dropLocation?.trim() || registration.school,
    studentName: fields.name?.trim() || registration.studentName,
    classSection: fields.classSection?.trim() || registration.classSection,
  });
}

export async function listCustomerOrders(phone: string): Promise<DeliveryOrder[]> {
  await syncFromFirestore();
  const orders = await loadAllOrdersLocal();
  return orders
    .filter((o) => phoneMatches(o.customerPhone, phone))
    .sort((a, b) => (b.bookedAt ?? '').localeCompare(a.bookedAt ?? ''));
}

export async function listPendingPickups(): Promise<DeliveryOrder[]> {
  await syncFromFirestore();
  const orders = await loadAllOrdersLocal();
  return orders.filter((o) => o.status === 'awaiting_driver' && !o.driver);
}

export async function listDriverActiveOrders(driverId: string): Promise<DeliveryOrder[]> {
  await syncFromFirestore();
  const orders = await loadAllOrdersLocal();
  return orders.filter(
    (o) =>
      o.driver?.id === driverId &&
      o.status !== 'delivered' &&
      o.status !== 'booked' &&
      o.status !== 'pickup_closed',
  );
}

export async function listDriverCompletedToday(driverId: string): Promise<DeliveryOrder[]> {
  await syncFromFirestore();
  const orders = await loadAllOrdersLocal();
  const today = new Date().toISOString().slice(0, 10);
  return orders.filter(
    (o) =>
      o.driver?.id === driverId &&
      o.status === 'delivered' &&
      (o.date === today || o.date.startsWith(today)),
  );
}

export async function listDriverCancelledToday(driverId: string): Promise<DeliveryOrder[]> {
  await syncFromFirestore();
  const orders = await loadAllOrdersLocal();
  const today = new Date().toISOString().slice(0, 10);
  return orders.filter(
    (o) =>
      o.driver?.id === driverId &&
      o.status === 'pickup_closed' &&
      (o.date === today || o.date.startsWith(today)),
  );
}

export async function countDriverTotalDeliveries(driverId: string): Promise<number> {
  await syncFromFirestore();
  const orders = await loadAllOrdersLocal();
  return orders.filter((o) => o.driver?.id === driverId && o.status === 'delivered').length;
}

export async function listAllOrdersToday(): Promise<DeliveryOrder[]> {
  await syncFromFirestore();
  await processExpiredPickupOrders();
  const orders = await loadAllOrdersLocal();
  await buildSchoolBatches(orders);
  return orders;
}

export async function cancelCustomerOrder(phone: string): Promise<DeliveryOrder> {
  const order = await getCustomerOrderToday(phone);
  if (!order) {
    throw new Error('No active order found');
  }
  if (order.status === 'delivered') {
    throw new Error('Cannot cancel a completed delivery');
  }
  if (order.status === 'pickup_closed') {
    return order;
  }

  const cancellable: DeliveryStatus[] = [
    'booked',
    'food_ready',
    'awaiting_driver',
    'driver_assigned',
    'at_pickup',
    'pickup_verified',
  ];
  if (!cancellable.includes(order.status)) {
    throw new Error('This order cannot be cancelled');
  }

  const updated: DeliveryOrder = {
    ...order,
    status: 'pickup_closed',
    pickupClosedAt: formatTime(new Date()),
    driver: null,
  };

  await persistOrder(updated);
  return updated;
}

export async function processExpiredPickupOrders(): Promise<DeliveryOrder[]> {
  await syncFromFirestore();
  const orders = await loadAllOrdersLocal();
  const now = Date.now();
  const closed: DeliveryOrder[] = [];

  for (const order of orders) {
    if (!order.pickupExpiresAtIso) continue;
    if (!['awaiting_driver', 'food_ready', 'driver_assigned', 'at_pickup'].includes(order.status)) continue;
    if (new Date(order.pickupExpiresAtIso).getTime() > now) continue;

    const updated: DeliveryOrder = {
      ...order,
      status: 'pickup_closed',
      pickupClosedAt: formatTime(new Date()),
      driver: null,
    };
    await persistOrder(updated);
    closed.push(updated);
  }

  return closed;
}

export async function listAvailableDrivers() {
  const registered = await loadRegisteredDrivers();
  return registered
    .filter((driver) => driver.approvalStatus === 'approved' && driver.status !== 'Offline')
    .map((driver) => ({
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      vehicle: driver.vehicle,
      status: driver.status,
    }));
}

async function resolveDriverById(driverId: string) {
  const registered = await loadRegisteredDrivers();
  const match = registered.find((driver) => driver.id === driverId);
  if (!match) return undefined;
  return {
    id: match.id,
    name: match.name,
    phone: match.phone,
    vehicle: match.vehicle,
    status: match.status,
  };
}

export function subscribeToPendingPickups(onPickups: (orders: DeliveryOrder[]) => void): () => void {
  return subscribeToAllOrdersToday((orders) => {
    onPickups(orders.filter((o) => o.status === 'awaiting_driver' && !o.driver));
  });
}

export function subscribeToDriverOrdersToday(
  driverId: string,
  onOrders: (orders: DeliveryOrder[]) => void,
): () => void {
  return subscribeToAllOrdersToday((orders) => {
    onOrders(
      orders.filter(
        (o) => o.driver?.id === driverId && o.status !== 'delivered' && o.status !== 'booked',
      ),
    );
  });
}

export async function assignDriverByAdmin(orderId: string, driverId: string): Promise<DeliveryOrder> {
  const driver = await resolveDriverById(driverId);
  if (!driver) throw new Error('Driver not found');

  const order = await acceptPickup(orderId, {
    id: driver.id,
    name: driver.name,
    vehicle: driver.vehicle,
    phone: driver.phone,
  });

  return order;
}

export async function markOrderCodCashCollected(orderId: string, adminId: string): Promise<DeliveryOrder> {
  const order = await loadOrder(orderId);
  if (!order) throw new Error('Order not found');
  const pendingByCash =
    order.payment_status === 'PENDING_COD' ||
    (order.payment_method === 'COD' && order.payment_status !== 'COLLECTED_COD' && order.payment_status !== 'PAID') ||
    ((order.paymentMethod ?? '').toLowerCase().includes('cash') &&
      order.payment_status !== 'COLLECTED_COD' &&
      !(typeof order.amountPaid === 'number' && order.amountPaid > 0));

  if (!pendingByCash) {
    throw new Error('This order does not have pending By Cash payment.');
  }

  const collectedAmount = order.amount_due ?? order.amountPaid ?? 0;
  const updated: DeliveryOrder = {
    ...order,
    payment_method: 'COD',
    payment_status: 'COLLECTED_COD',
    paymentMethod: 'By Cash',
    amountPaid: collectedAmount > 0 ? collectedAmount : order.amount_due ?? 0,
    amount_due: 0,
    cash_collected_at: new Date().toISOString(),
    cash_collected_by: adminId,
  };
  await persistOrder(updated);
  await markSubscriptionCodCollected(order.customerPhone, adminId);
  return updated;
}

function buildDriverInfo(
  driver: {
    id: string;
    name: string;
    vehicle?: string;
    phone?: string;
  },
  rating = '5.0',
): DeliveryDriver {
  return {
    id: driver.id,
    name: driver.name,
    vehicle: driver.vehicle ?? 'DL 4C AB 1234',
    rating,
    initials: getInitials(driver.name),
    etaMinutes: 8,
    ...(driver.phone ? { phone: normalizePhone(driver.phone) } : {}),
  };
}

const ASSIGNABLE_STATUSES: DeliveryStatus[] = [
  'booked',
  'food_ready',
  'awaiting_driver',
  'driver_assigned',
];

export async function acceptPickup(
  orderId: string,
  driver: { id: string; name: string; vehicle?: string; phone?: string },
): Promise<DeliveryOrder> {
  const order = await loadOrder(orderId);
  if (!order) throw new Error('Order not found');
  if (!ASSIGNABLE_STATUSES.includes(order.status)) throw new Error('Order is no longer available');

  const locatedOrder = await hydrateOrderLocations(order);

  const driverRecord = driver.phone ? { phone: driver.phone } : await resolveDriverById(driver.id);
  const driverPhone = driverRecord?.phone ? normalizePhone(driverRecord.phone) : undefined;
  const ratingSummary = await getDriverRatingSummary(driver.id);

  const driverInfo = buildDriverInfo(
    {
      ...driver,
      phone: driverPhone ?? driver.phone,
    },
    ratingSummary.average,
  );
  const activeForDriver = await listDriverActiveOrders(driver.id);
  const allActive = [...activeForDriver, { ...locatedOrder, driver: driverInfo, status: 'driver_assigned' as DeliveryStatus }];
  const routePlan = planRoute(allActive);

  const updated: DeliveryOrder = {
    ...locatedOrder,
    status: 'driver_assigned',
    ...(driverPhone ? { assignedDriverPhone: driverPhone } : {}),
    routePlan,
    driver: driverInfo,
    driverLocation: computeDriverLocation({
      ...locatedOrder,
      status: 'driver_assigned',
      driver: driverInfo,
    }),
    ...applyEta({ ...locatedOrder, driver: driverInfo }, routePlan.etaMinutes),
  };

  await persistOrder(updated);

  try {
    const { setDriverDutyStatus } = await import('./userRegistryService');
    await setDriverDutyStatus(driver.id, 'On Route');
  } catch {
    // Availability update is best-effort for admin live map.
  }

  // Kick live GPS for this driver as soon as they accept.
  try {
    const { refreshDriverLocationForOrders } = await import('./driverLocationService');
    const activeIds = allActive.map((entry) => entry.id);
    await refreshDriverLocationForOrders(driver.id, activeIds);
  } catch {
    // Location permission may be denied.
  }

  for (const activeOrder of allActive) {
    if (activeOrder.id !== order.id) {
      await persistOrder({ ...activeOrder, routePlan });
    }
  }

  return updated;
}

export async function markAtPickup(orderId: string): Promise<DeliveryOrder> {
  const order = await loadOrder(orderId);
  if (!order) throw new Error('Order not found');

  const updated: DeliveryOrder = {
    ...order,
    status: 'at_pickup',
    driverLocation: computeDriverLocation({ ...order, status: 'at_pickup' }),
  };
  await persistOrder(updated);

  return updated;
}

export async function verifyPickup(orderId: string, code: string): Promise<DeliveryOrder> {
  const order = await loadOrder(orderId);
  if (!order) throw new Error('Order not found');

  let normalized = code.trim();
  try {
    const parsed = JSON.parse(normalized) as { code?: string; otp?: string };
    if (parsed.code) normalized = parsed.code.trim();
    else if (parsed.otp) normalized = parsed.otp.trim();
  } catch {
    // Plain OTP or QR code text
  }

  const upper = normalized.toUpperCase();
  const otpMatch = Boolean(order.pickupOtp) && normalized === order.pickupOtp;
  const qrMatch = Boolean(order.qrCode) && upper === order.qrCode.toUpperCase();

  if (!otpMatch && !qrMatch) {
    throw new Error('Invalid OTP or QR code');
  }

  const updated: DeliveryOrder = {
    ...order,
    status: 'pickup_verified',
    pickupVerifiedAt: formatTime(new Date()),
    driverLocation: computeDriverLocation({ ...order, status: 'pickup_verified' }),
  };
  await persistOrder(updated);

  return updated;
}

export async function markPickedUp(orderId: string): Promise<DeliveryOrder> {
  const order = await loadOrder(orderId);
  if (!order) throw new Error('Order not found');

  if (order.status !== 'pickup_verified' && order.status !== 'at_pickup' && order.status !== 'driver_assigned') {
    throw new Error('Verify pickup with OTP or QR first');
  }

  const updated: DeliveryOrder = {
    ...order,
    status: 'picked_up',
    pickedUpAt: formatTime(new Date()),
    driverLocation: computeDriverLocation({ ...order, status: 'picked_up', driver: order.driver }),
  };
  await persistOrder(updated);

  return updated;
}

export async function markInTransit(orderId: string): Promise<DeliveryOrder> {
  const order = await loadOrder(orderId);
  if (!order) throw new Error('Order not found');

  if (order.status === 'in_transit' || order.status === 'at_drop' || order.status === 'delivered') {
    return order;
  }
  if (order.status !== 'picked_up' && order.status !== 'pickup_verified') {
    throw new Error('Complete pickup before starting delivery');
  }

  const updated: DeliveryOrder = {
    ...order,
    status: 'in_transit',
    pickedUpAt: order.pickedUpAt ?? formatTime(new Date()),
    driverLocation: computeDriverLocation({ ...order, status: 'in_transit', driver: order.driver }),
    ...applyEta(order, 14),
  };
  await persistOrder(updated);

  return updated;
}

export async function markAtDrop(orderId: string): Promise<DeliveryOrder> {
  const order = await loadOrder(orderId);
  if (!order) throw new Error('Order not found');

  const updated: DeliveryOrder = {
    ...order,
    status: 'at_drop',
    driverLocation: computeDriverLocation({ ...order, status: 'at_drop' }),
  };
  await persistOrder(updated);

  return updated;
}

export async function markDelivered(
  orderId: string,
  options?: { silent?: boolean; proofImageUrl?: string },
): Promise<DeliveryOrder> {
  const order = await loadOrderById(orderId);
  if (!order) throw new Error('Order not found');

  const updated: DeliveryOrder = {
    ...order,
    status: 'delivered',
    deliveredAt: formatTime(new Date()),
    driverLocation: computeDriverLocation({ ...order, status: 'delivered', driver: order.driver }),
    ...applyEta(order, 0),
    deliveryProof: {
      ...(order.deliveryProof ?? {}),
      otpVerified: Boolean(order.pickupVerifiedAt),
      qrVerified: Boolean(order.qrCode),
      ...(options?.proofImageUrl?.trim()
        ? { proofImageUrl: options.proofImageUrl.trim(), proofCapturedAt: new Date().toISOString() }
        : {}),
    },
  };
  await persistOrder(updated);

  try {
    const { notifyCustomerLunchboxDelivered } = await import('./pushNotificationService');
    await notifyCustomerLunchboxDelivered(updated);
  } catch {
    // Home-screen push is best-effort; delivery still completes.
  }

  if (order.customerPhone) {
    const { expireSubscriptionAfterDelivery } = await import('./subscriptionService');
    await expireSubscriptionAfterDelivery(order.customerPhone, order.students);
  }

  if (order.driver?.id) {
    await incrementDriverCompletedDeliveries(order.driver.id);
    try {
      const remaining = await listDriverActiveOrders(order.driver.id);
      const stillActive = remaining.filter((entry) => entry.id !== orderId);
      const { setDriverDutyStatus } = await import('./userRegistryService');
      await setDriverDutyStatus(order.driver.id, stillActive.length > 0 ? 'On Route' : 'Available');
      if (stillActive.length === 0) {
        const { refreshDriverLocationForOrders } = await import('./driverLocationService');
        await refreshDriverLocationForOrders(order.driver.id, []);
      }
    } catch {
      // Duty status is best-effort.
    }
  }

  if (!options?.silent) {
    await logDeliveryConfirmation({
      orderIds: [orderId],
      driverId: order.driver?.id,
      driverName: order.driver?.name,
      school: order.school,
      method: 'single',
      batchId: order.batchId,
    });
  }

  return updated;
}

export async function completeDeliveryWithProof(orderId: string, proofImageUrl: string): Promise<DeliveryOrder> {
  return markDelivered(orderId, { proofImageUrl });
}

export async function markBatchOrdersDelivered(batchId: string): Promise<DeliveryOrder[]> {
  const batch = await closeBatchRecord(batchId);
  if (!batch) throw new Error('Batch not found');

  const delivered: DeliveryOrder[] = [];
  for (const orderId of batch.orderIds) {
    const order = await loadOrder(orderId);
    if (!order || order.status === 'delivered') continue;
    delivered.push(await markDelivered(orderId, { silent: true }));
  }

  await logDeliveryConfirmation({
    batchId,
    orderIds: batch.orderIds,
    driverId: batch.driverId,
    driverName: batch.driverName,
    school: batch.school,
    method: 'batch',
  });

  return delivered;
}

async function updateOrderStatus(orderId: string, status: DeliveryStatus): Promise<DeliveryOrder> {
  const order = await loadOrder(orderId);
  if (!order) throw new Error('Order not found');
  const updated = { ...order, status };
  await persistOrder(updated);
  return updated;
}

export function getStatusLabel(status: DeliveryStatus): string {
  const labels: Record<DeliveryStatus, string> = {
    booked: 'Booked',
    food_ready: 'Food Ready',
    awaiting_driver: 'Awaiting Driver',
    driver_assigned: 'Driver Assigned',
    at_pickup: 'At Pickup',
    pickup_verified: 'Verified',
    picked_up: 'Picked Up',
    in_transit: 'In Transit',
    at_drop: 'At School',
    delivered: 'Delivered',
    pickup_closed: 'Cancelled',
  };
  return labels[status];
}

export function getStatusBadgeTone(status: DeliveryStatus): 'orange' | 'green' | 'blue' | 'red' {
  if (status === 'delivered') return 'green';
  if (status === 'pickup_closed') return 'red';
  if (status === 'booked' || status === 'awaiting_driver' || status === 'food_ready') return 'orange';
  return 'orange';
}

export function getAdminStatusLabel(status: DeliveryStatus): string {
  if (status === 'awaiting_driver') return 'Food Ready';
  if (status === 'pickup_verified') return 'Verified';
  if (status === 'at_pickup') return 'At Pickup';
  if (status === 'at_drop') return 'At Drop';
  if (status === 'pickup_closed') return 'Cancelled';
  return getStatusLabel(status);
}

function statusRank(status: DeliveryStatus): number {
  const ranks: DeliveryStatus[] = [
    'booked',
    'food_ready',
    'awaiting_driver',
    'driver_assigned',
    'at_pickup',
    'pickup_verified',
    'picked_up',
    'in_transit',
    'at_drop',
    'delivered',
  ];
  return ranks.indexOf(status);
}

export function buildTimeline(order: DeliveryOrder | null): TimelineStep[] {
  if (!order) return [];

  const current = statusRank(order.status);
  const step = (title: string, time: string, stepRank: number): TimelineStep => ({
    title,
    time,
    status: current > stepRank ? 'done' : current === stepRank ? 'active' : 'pending',
  });

  return [
    step('Order Created', order.bookedAt ?? '—', 0),
    step('Food Ready', order.foodReadyAt ?? '—', 2),
    step('Driver Assigned', order.driver?.name ? order.foodReadyAt ?? '—' : '—', 3),
    step('Picked Up', order.pickedUpAt ?? '—', 6),
    step('In Transit', order.pickedUpAt ? 'Now' : '—', 7),
    step('Delivered', order.deliveredAt ?? '—', 9),
  ];
}

export function getTrackingTimeline(order: DeliveryOrder | null): TimelineStep[] {
  if (!order) return [];
  const rank = ['picked_up', 'in_transit', 'at_drop', 'delivered'].includes(order.status) ? 1 : 0;
  return [
    { title: 'Picked Up', time: order.pickedUpAt ?? '—', status: rank >= 1 ? 'done' : 'pending' },
    { title: 'In Transit', time: rank >= 1 ? 'Now' : '—', status: order.status === 'in_transit' || order.status === 'at_drop' ? 'active' : rank >= 1 ? 'done' : 'pending' },
  ];
}
