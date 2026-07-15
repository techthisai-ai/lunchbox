import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { normalizePhone } from '../constants/auth';
import { db, functions } from '../lib/firebase';
import { DeliveryType, normalizeDeliveryType } from '../types/delivery';

const CUSTOMERS_KEY = '@lunchflow_registered_customers';
const DRIVERS_KEY = '@lunchflow_registered_drivers';

const registerPendingDriverFn = httpsCallable(functions, 'registerPendingDriver');
const setDriverApprovalStatusFn = httpsCallable(functions, 'setDriverApprovalStatus');
const listPendingDriversRemoteFn = httpsCallable(functions, 'listPendingDriversFn');

export type CustomerRegistration = {
  name: string;
  phone: string;
  address: string;
  registrationType: DeliveryType;
  school: string;
  studentName: string;
  classSection: string;
  emergencyContact: string;
  referralCode?: string;
};

export type DriverRegistration = {
  name: string;
  phone: string;
  vehicle: string;
  licenseNumber: string;
};

export type RegisteredCustomer = CustomerRegistration & {
  id: string;
  registeredAt?: string;
};

export type DriverApprovalStatus = 'pending' | 'approved' | 'rejected';

export type RegisteredDriver = {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  licenseNumber: string;
  status: 'Available' | 'On Route' | 'Offline';
  approvalStatus: DriverApprovalStatus;
  registeredAt?: string;
  ratingAverage?: string;
  ratingCount?: number;
  completedDeliveries?: number;
  password?: string;
};

function parseDriverRecord(
  data: Record<string, unknown>,
  docId: string,
): RegisteredDriver | null {
  const phone = normalizePhone(String(data.phone ?? ''));
  if (phone.length !== 10) return null;
  const status =
    data.status === 'On Route' || data.status === 'Offline' ? data.status : 'Available';
  const approvalStatus =
    data.approvalStatus === 'pending' || data.approvalStatus === 'rejected'
      ? data.approvalStatus
      : 'approved';

  return {
    id: String(data.id ?? docId),
    name: String(data.name ?? ''),
    phone,
    vehicle: String(data.vehicle ?? ''),
    licenseNumber: String(data.licenseNumber ?? ''),
    status,
    approvalStatus,
    registeredAt: data.registeredAt ? String(data.registeredAt) : data.createdAt ? String(data.createdAt) : undefined,
    ratingAverage: data.ratingAverage != null ? String(data.ratingAverage) : undefined,
    ratingCount: typeof data.ratingCount === 'number' ? data.ratingCount : undefined,
    completedDeliveries:
      typeof data.completedDeliveries === 'number' ? data.completedDeliveries : undefined,
    password: data.password ? String(data.password) : undefined,
  };
}

export class RegistrationRequiredError extends Error {
  readonly kind: 'customer' | 'driver';

  constructor(kind: 'customer' | 'driver') {
    super(kind === 'customer' ? 'Phone number not registered' : 'Driver not registered');
    this.name = 'RegistrationRequiredError';
    this.kind = kind;
  }
}

async function readCustomerMap(): Promise<Record<string, CustomerRegistration & { registeredAt?: string }>> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOMERS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CustomerRegistration & { registeredAt?: string }>) : {};
  } catch {
    return {};
  }
}

async function readDriverMap(): Promise<Record<string, RegisteredDriver>> {
  try {
    const raw = await AsyncStorage.getItem(DRIVERS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, RegisteredDriver>) : {};
  } catch {
    return {};
  }
}

export async function isCustomerRegistered(phone: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return false;

  const local = await readCustomerMap();
  if (local[normalized]) return true;

  try {
    const snap = await getDoc(doc(db, 'users', normalized));
    if (snap.exists()) {
      const registration = customerFromFirestoreData(normalized, snap.data() as Record<string, unknown>);
      await cacheCustomerRegistrationLocal(registration);
      return true;
    }

    // Fallback: find by phone field if the doc id was not the mobile number.
    const usersSnap = await getDocs(query(collection(db, 'users'), where('phone', '==', normalized)));
    for (const entry of usersSnap.docs) {
      const data = entry.data() as Record<string, unknown>;
      if (data.role && data.role !== 'customer') continue;
      const registration = customerFromFirestoreData(normalized, data);
      await cacheCustomerRegistrationLocal(registration);
      return true;
    }

    return false;
  } catch {
    // Keep local-only accounts usable when remote lookup fails.
    return Boolean(local[normalized]);
  }
}

async function cacheCustomerRegistrationLocal(registration: CustomerRegistration): Promise<void> {
  const phone = normalizePhone(registration.phone);
  const local = await readCustomerMap();
  local[phone] = {
    ...registration,
    phone,
    registrationType: normalizeDeliveryType(registration.registrationType),
    registeredAt: local[phone]?.registeredAt ?? new Date().toISOString(),
  };
  await AsyncStorage.setItem(CUSTOMERS_KEY, JSON.stringify(local));
}

function customerFromFirestoreData(
  normalized: string,
  data: Record<string, unknown>,
): CustomerRegistration {
  return {
    name: String(data.name ?? ''),
    phone: normalized,
    address: String(data.address ?? ''),
    registrationType: normalizeDeliveryType(data.registrationType),
    school: String(data.school ?? ''),
    studentName: String(data.studentName ?? ''),
    classSection: String(data.classSection ?? ''),
    emergencyContact: String(data.emergencyContact ?? ''),
    referralCode: data.referralCode ? String(data.referralCode) : undefined,
  };
}

export async function saveCustomerRegistration(data: CustomerRegistration): Promise<void> {
  const phone = normalizePhone(data.phone);
  const now = new Date().toISOString();
  const payload = {
    ...data,
    phone,
    registrationType: normalizeDeliveryType(data.registrationType),
    registeredAt: now,
  };

  const local = await readCustomerMap();
  const existingRegisteredAt = local[phone]?.registeredAt;
  local[phone] = {
    ...payload,
    registeredAt: existingRegisteredAt ?? now,
  };
  await AsyncStorage.setItem(CUSTOMERS_KEY, JSON.stringify(local));

  try {
    await setDoc(
      doc(db, 'users', phone),
      {
        ...local[phone],
        role: 'customer',
        createdAt: existingRegisteredAt ?? now,
        updatedAt: now,
      },
      { merge: true },
    );
  } catch (error) {
    console.warn('[saveCustomerRegistration] Firestore write failed', error);
  }
}

export async function updateCustomerRegistration(
  phone: string,
  fields: Partial<CustomerRegistration>,
): Promise<CustomerRegistration> {
  const normalized = normalizePhone(phone);
  const existing = await loadCustomerRegistration(normalized);
  if (!existing) {
    throw new Error('Customer registration not found');
  }

  const updated: CustomerRegistration = {
    ...existing,
    ...fields,
    phone: normalized,
    registrationType: fields.registrationType
      ? normalizeDeliveryType(fields.registrationType)
      : existing.registrationType,
  };

  const local = await readCustomerMap();
  local[normalized] = {
    ...updated,
    registeredAt: local[normalized]?.registeredAt ?? new Date().toISOString(),
  };
  await AsyncStorage.setItem(CUSTOMERS_KEY, JSON.stringify(local));

  try {
    await setDoc(
      doc(db, 'users', normalized),
      {
        ...updated,
        role: 'customer',
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch {
    // Local registry remains source of truth when remote write fails.
  }

  return updated;
}

export async function loadCustomerRegistration(phone: string): Promise<CustomerRegistration | null> {
  const normalized = normalizePhone(phone);
  const local = await readCustomerMap();
  if (local[normalized]) {
    return {
      ...local[normalized],
      registrationType: normalizeDeliveryType(local[normalized].registrationType),
    };
  }

  try {
    const snap = await getDoc(doc(db, 'users', normalized));
    if (!snap.exists()) return null;
    const registration = customerFromFirestoreData(normalized, snap.data() as Record<string, unknown>);
    await cacheCustomerRegistrationLocal(registration);
    return registration;
  } catch {
    return null;
  }
}

export async function isDriverRegistered(phone: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return false;

  const driver = await loadDriverByPhone(normalized);
  return Boolean(driver);
}

export async function loadRegisteredCustomers(): Promise<RegisteredCustomer[]> {
  const local = await readCustomerMap();
  const byPhone = new Map<string, RegisteredCustomer>();

  for (const [phone, data] of Object.entries(local)) {
    const normalized = normalizePhone(phone);
    byPhone.set(normalized, {
      ...data,
      id: `CUS-${normalized.slice(-4)}`,
      phone: normalized,
      registrationType: normalizeDeliveryType(data.registrationType),
      registeredAt: data.registeredAt,
    });
  }

  try {
    const snap = await getDocs(collection(db, 'users'));
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (data.role === 'driver') continue;
      const phone = normalizePhone(String(data.phone ?? docSnap.id));
      if (phone.length !== 10) continue;
      byPhone.set(phone, {
        id: `CUS-${phone.slice(-4)}`,
        name: String(data.name ?? ''),
        phone,
        address: String(data.address ?? ''),
        registrationType: normalizeDeliveryType(data.registrationType),
        school: String(data.school ?? ''),
        studentName: String(data.studentName ?? ''),
        classSection: String(data.classSection ?? ''),
        emergencyContact: String(data.emergencyContact ?? ''),
        registeredAt: String(data.registeredAt ?? data.createdAt ?? ''),
      });
    }
  } catch {
    // Local registry is enough when remote read fails.
  }

  // Recover customers whose Firestore profile write failed under old rules:
  // if they already have today's order, still show them in admin.
  try {
    const today = new Date().toISOString().slice(0, 10);
    const ordersSnap = await getDocs(query(collection(db, 'orders'), where('date', '==', today)));
    for (const docSnap of ordersSnap.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      const phone = normalizePhone(String(data.customerPhone ?? ''));
      if (phone.length !== 10 || byPhone.has(phone)) continue;
      byPhone.set(phone, {
        id: `CUS-${phone.slice(-4)}`,
        name: String(data.customerName ?? 'Customer'),
        phone,
        address: String(data.pickupAddress ?? ''),
        registrationType: normalizeDeliveryType(data.deliveryType),
        school: String(data.school ?? data.dropAddress ?? ''),
        studentName: String(data.studentName ?? ''),
        classSection: '',
        emergencyContact: '',
        registeredAt: String(data.bookedAt ?? today),
      });
    }
  } catch {
    // Ignore order backfill failures.
  }

  return Array.from(byPhone.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadRegisteredDrivers(): Promise<RegisteredDriver[]> {
  const local = await readDriverMap();
  const byPhone = new Map<string, RegisteredDriver>();
  const fromDriversCollection = new Set<string>();

  for (const driver of Object.values(local)) {
    byPhone.set(normalizePhone(driver.phone), {
      ...driver,
      approvalStatus: driver.approvalStatus ?? 'approved',
    });
  }

  try {
    const snap = await getDocs(collection(db, 'drivers'));
    for (const docSnap of snap.docs) {
      const parsed = parseDriverRecord(docSnap.data() as Record<string, unknown>, docSnap.id);
      if (!parsed) continue;
      byPhone.set(parsed.phone, parsed);
      local[parsed.phone] = parsed;
      fromDriversCollection.add(parsed.phone);
    }
  } catch (error) {
    console.warn('[loadRegisteredDrivers] Firestore drivers read failed', error);
  }

  // Mirror path: pending drivers are also written under users/{phone} with role=driver.
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const docSnap of usersSnap.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      if (data.role !== 'driver') continue;
      const parsed = parseDriverRecord(
        {
          ...data,
          id: data.driverId ?? data.id ?? `DRV-${String(docSnap.id).slice(-4)}`,
        },
        String(data.driverId ?? data.id ?? docSnap.id),
      );
      if (!parsed || fromDriversCollection.has(parsed.phone)) continue;
      byPhone.set(parsed.phone, parsed);
      local[parsed.phone] = parsed;
    }
  } catch (error) {
    console.warn('[loadRegisteredDrivers] Firestore users mirror read failed', error);
  }

  try {
    await AsyncStorage.setItem(DRIVERS_KEY, JSON.stringify(local));
  } catch {
    // Ignore local cache write failures.
  }

  return Array.from(byPhone.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadPendingDrivers(): Promise<RegisteredDriver[]> {
  const drivers = await loadRegisteredDrivers();
  const localPending = drivers.filter((driver) => driver.approvalStatus === 'pending');
  if (localPending.length > 0) return localPending;

  // Optional Admin SDK path (requires deployed functions on Blaze).
  try {
    const result = await listPendingDriversRemoteFn({});
    const payload = result.data as { drivers?: RegisteredDriver[] };
    if (Array.isArray(payload.drivers)) {
      return payload.drivers
        .filter((entry) => entry.approvalStatus === 'pending')
        .sort((a, b) => a.name.localeCompare(b.name));
    }
  } catch {
    // Callable may be undeployed; local/Firestore merge above is enough.
  }

  return localPending;
}

export async function loadDriverByPhone(phone: string): Promise<RegisteredDriver | null> {
  const normalized = normalizePhone(phone);
  const local = await readDriverMap();
  let driver = local[normalized]
    ? { ...local[normalized], approvalStatus: local[normalized].approvalStatus ?? 'approved' }
    : null;

  try {
    const snap = await getDocs(collection(db, 'drivers'));
    for (const docSnap of snap.docs) {
      const parsed = parseDriverRecord(docSnap.data() as Record<string, unknown>, docSnap.id);
      if (parsed?.phone === normalized) {
        driver = parsed;
        const nextLocal = await readDriverMap();
        nextLocal[normalized] = parsed;
        await AsyncStorage.setItem(DRIVERS_KEY, JSON.stringify(nextLocal));
        break;
      }
    }
  } catch {
    // Fall back to local registry.
  }

  return driver;
}

export async function isDriverApproved(phone: string): Promise<boolean> {
  const driver = await loadDriverByPhone(phone);
  return (driver?.approvalStatus ?? 'approved') === 'approved';
}

export async function updateDriverApproval(
  driverId: string,
  approvalStatus: DriverApprovalStatus,
): Promise<RegisteredDriver> {
  const drivers = await loadRegisteredDrivers();
  const target = drivers.find((driver) => driver.id === driverId);
  if (!target) {
    throw new Error('Driver not found');
  }

  const nextStatus = approvalStatus === 'approved' ? 'Available' : 'Offline';
  const updated: RegisteredDriver = {
    ...target,
    approvalStatus,
    status: nextStatus,
  };

  const local = await readDriverMap();
  local[target.phone] = updated;
  await AsyncStorage.setItem(DRIVERS_KEY, JSON.stringify(local));

  const synced = await writeDriverToFirestore(updated);
  if (synced) return updated;

  // Fallback: Admin SDK callable when direct Firestore writes are blocked.
  try {
    const result = await setDriverApprovalStatusFn({
      driverId: target.id,
      phone: target.phone,
      approvalStatus,
    });
    const remote = (result.data as { driver?: RegisteredDriver }).driver;
    if (remote?.id) {
      const merged: RegisteredDriver = {
        ...updated,
        ...remote,
        approvalStatus,
        status: nextStatus,
      };
      local[merged.phone] = merged;
      await AsyncStorage.setItem(DRIVERS_KEY, JSON.stringify(local));
      return merged;
    }
  } catch (error) {
    console.warn('[updateDriverApproval] callable failed', error);
  }

  throw new Error('Could not save approval to server. Please try again.');
}

export async function approveDriver(driverId: string): Promise<RegisteredDriver> {
  return updateDriverApproval(driverId, 'approved');
}

export async function rejectDriver(driverId: string): Promise<RegisteredDriver> {
  return updateDriverApproval(driverId, 'rejected');
}

export async function setDriverAvailability(driverId: string, active: boolean): Promise<RegisteredDriver> {
  const drivers = await loadRegisteredDrivers();
  const target = drivers.find((driver) => driver.id === driverId);
  if (!target) {
    throw new Error('Driver not found');
  }
  if (target.approvalStatus !== 'approved') {
    throw new Error('Approve the driver before changing availability');
  }

  const nextStatus = active ? 'Available' : 'Offline';
  if (target.status === nextStatus) return target;

  const updated: RegisteredDriver = {
    ...target,
    status: nextStatus,
  };

  const local = await readDriverMap();
  local[target.phone] = updated;
  await AsyncStorage.setItem(DRIVERS_KEY, JSON.stringify(local));

  await writeDriverToFirestore(updated);

  return updated;
}

export async function setDriverDutyStatus(
  driverId: string,
  status: 'Available' | 'On Route' | 'Offline',
): Promise<void> {
  const drivers = await loadRegisteredDrivers();
  const target = drivers.find((driver) => driver.id === driverId);
  if (!target) {
    // Still try Firestore write for newly accepted drivers.
    try {
      await setDoc(
        doc(db, 'drivers', driverId),
        { status, updatedAt: new Date().toISOString() },
        { merge: true },
      );
    } catch {
      // Ignore.
    }
    return;
  }
  if (target.status === status) return;

  const updated: RegisteredDriver = { ...target, status };
  const local = await readDriverMap();
  local[target.phone] = updated;
  await AsyncStorage.setItem(DRIVERS_KEY, JSON.stringify(local));
  await writeDriverToFirestore(updated);
}

async function writeDriverToFirestore(record: RegisteredDriver): Promise<boolean> {
  const payload = {
    ...record,
    role: 'driver' as const,
    driverId: record.id,
    createdAt: record.registeredAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let wroteDrivers = false;
  let wroteUsers = false;

  try {
    await setDoc(doc(db, 'drivers', record.id), payload, { merge: true });
    wroteDrivers = true;
  } catch (error) {
    console.warn('[writeDriverToFirestore] drivers write failed', error);
  }

  try {
    await setDoc(doc(db, 'users', record.phone), payload, { merge: true });
    wroteUsers = true;
  } catch (error) {
    console.warn('[writeDriverToFirestore] users mirror write failed', error);
  }

  return wroteDrivers || wroteUsers;
}

/** Re-push a locally saved driver (e.g. pending approval) to Firestore. */
export async function syncDriverRecordToRemote(phone: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  const localMap = await readDriverMap();
  const localDriver = localMap[normalized];
  if (!localDriver) {
    const remote = await loadDriverByPhone(normalized);
    if (!remote) return false;
    return writeDriverToFirestore(remote);
  }

  const synced = await writeDriverToFirestore(localDriver);
  if (synced) return true;

  try {
    await registerPendingDriverFn({
      name: localDriver.name,
      phone: localDriver.phone,
      vehicle: localDriver.vehicle,
      licenseNumber: localDriver.licenseNumber,
      approvedByAdmin: localDriver.approvalStatus === 'approved',
    });
    return true;
  } catch (error) {
    console.warn('[syncDriverRecordToRemote] register callable failed, trying approval sync', error);
  }

  try {
    await setDriverApprovalStatusFn({
      driverId: localDriver.id,
      phone: localDriver.phone,
      approvalStatus: localDriver.approvalStatus ?? 'pending',
    });
    return true;
  } catch (error) {
    console.warn('[syncDriverRecordToRemote] approval callable failed', error);
    return false;
  }
}

export async function registerDriverRecord(
  data: DriverRegistration,
  options?: { approvedByAdmin?: boolean },
): Promise<RegisteredDriver> {
  const phone = normalizePhone(data.phone);
  if (phone.length !== 10) throw new Error('Enter a valid 10-digit mobile number');
  if (!data.name.trim()) throw new Error('Enter driver full name');
  if (!data.vehicle.trim()) throw new Error('Enter vehicle number');
  if (!data.licenseNumber.trim()) throw new Error('Enter driving license number');

  const existing = await isDriverRegistered(phone);
  if (existing) {
    throw new Error('This mobile number is already registered as a driver');
  }

  const approvalStatus: DriverApprovalStatus = options?.approvedByAdmin ? 'approved' : 'pending';

  const record: RegisteredDriver = {
    id: `DRV-${phone.slice(-4)}-${Date.now().toString().slice(-4)}`,
    name: data.name.trim(),
    phone,
    vehicle: data.vehicle.trim(),
    licenseNumber: data.licenseNumber.trim(),
    status: approvalStatus === 'approved' ? 'Available' : 'Offline',
    approvalStatus,
    registeredAt: new Date().toISOString(),
  };

  const local = await readDriverMap();
  local[phone] = record;
  await AsyncStorage.setItem(DRIVERS_KEY, JSON.stringify(local));

  const synced = await writeDriverToFirestore(record);
  if (synced) return record;

  // Fallback: Admin SDK callable when direct Firestore writes are blocked.
  try {
    const result = await registerPendingDriverFn({
      name: record.name,
      phone: record.phone,
      vehicle: record.vehicle,
      licenseNumber: record.licenseNumber,
      approvedByAdmin: Boolean(options?.approvedByAdmin),
    });
    const remote = (result.data as { driver?: RegisteredDriver }).driver;
    if (remote?.id && remote.phone) {
      const saved: RegisteredDriver = {
        id: remote.id,
        name: remote.name || record.name,
        phone: normalizePhone(remote.phone),
        vehicle: remote.vehicle || record.vehicle,
        licenseNumber: remote.licenseNumber || record.licenseNumber,
        status: remote.status || record.status,
        approvalStatus: remote.approvalStatus || approvalStatus,
        registeredAt: remote.registeredAt || record.registeredAt,
      };
      local[saved.phone] = saved;
      await AsyncStorage.setItem(DRIVERS_KEY, JSON.stringify(local));
      return saved;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes('already')) {
      throw new Error('This mobile number is already registered as a driver');
    }
    console.warn('[registerDriverRecord] callable failed', error);
  }

  console.warn(
    '[registerDriverRecord] Driver saved locally only; admin will not see approval until server sync succeeds',
  );
  return record;
}

async function persistDriverRecord(driver: RegisteredDriver): Promise<void> {
  const local = await readDriverMap();
  local[driver.phone] = driver;
  await AsyncStorage.setItem(DRIVERS_KEY, JSON.stringify(local));

  try {
    await setDoc(
      doc(db, 'drivers', driver.id),
      {
        ratingAverage: driver.ratingAverage,
        ratingCount: driver.ratingCount,
        completedDeliveries: driver.completedDeliveries,
        password: driver.password,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch {
    // Local registry remains source of truth when remote write fails.
  }
}

export async function updateDriverProfileFields(
  driverId: string,
  fields: Partial<Pick<RegisteredDriver, 'ratingAverage' | 'ratingCount' | 'completedDeliveries'>>,
): Promise<void> {
  const drivers = await loadRegisteredDrivers();
  const target = drivers.find((driver) => driver.id === driverId);
  if (!target) return;

  await persistDriverRecord({
    ...target,
    ...fields,
  });
}

export async function incrementDriverCompletedDeliveries(driverId: string): Promise<void> {
  const drivers = await loadRegisteredDrivers();
  const target = drivers.find((driver) => driver.id === driverId);
  if (!target) return;

  await persistDriverRecord({
    ...target,
    completedDeliveries: (target.completedDeliveries ?? 0) + 1,
  });
}

export async function getDriverProfileStats(driverId: string): Promise<{
  ratingAverage: string;
  reviewCount: number;
  completedDeliveries: number;
}> {
  const drivers = await loadRegisteredDrivers();
  const target = drivers.find((driver) => driver.id === driverId);

  return {
    ratingAverage: target?.ratingAverage ?? '5.0',
    reviewCount: target?.ratingCount ?? 0,
    completedDeliveries: target?.completedDeliveries ?? 0,
  };
}

export async function changeDriverPassword(
  phone: string,
  currentPassword: string,
  newPassword: string,
): Promise<string | null> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return 'Enter a valid mobile number';
  if (newPassword.length < 6) return 'Password must be at least 6 characters';

  const driver = await loadDriverByPhone(normalized);
  if (!driver) return 'Driver account not found';

  if (driver.password && driver.password !== currentPassword) {
    return 'Current password is incorrect';
  }
  if (!driver.password && currentPassword) {
    return 'No password set yet. Leave current password empty.';
  }

  await persistDriverRecord({ ...driver, password: newPassword });
  return null;
}

export function driverHasPassword(driver: RegisteredDriver | null): boolean {
  return Boolean(driver?.password?.trim());
}
