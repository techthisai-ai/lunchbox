import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { normalizePhone } from '../constants/auth';
import { db } from '../lib/firebase';
import { DeliveryType, normalizeDeliveryType } from '../types/delivery';

const CUSTOMERS_KEY = '@lunchflow_registered_customers';
const DRIVERS_KEY = '@lunchflow_registered_drivers';

export type CustomerRegistration = {
  name: string;
  phone: string;
  address: string;
  registrationType: DeliveryType;
  school: string;
  studentName: string;
  classSection: string;
  emergencyContact: string;
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
    return snap.exists();
  } catch {
    return false;
  }
}

export async function saveCustomerRegistration(data: CustomerRegistration): Promise<void> {
  const phone = normalizePhone(data.phone);
  const local = await readCustomerMap();
  local[phone] = { ...data, phone, registeredAt: new Date().toISOString() };
  await AsyncStorage.setItem(CUSTOMERS_KEY, JSON.stringify(local));
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
    const data = snap.data();
    return {
      name: data.name ?? '',
      phone: normalized,
      address: data.address ?? '',
      registrationType: normalizeDeliveryType(data.registrationType),
      school: data.school ?? '',
      studentName: data.studentName ?? '',
      classSection: data.classSection ?? '',
      emergencyContact: data.emergencyContact ?? '',
    };
  } catch {
    return null;
  }
}

export async function isDriverRegistered(phone: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return false;

  const local = await readDriverMap();
  return Boolean(local[normalized]);
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
        registeredAt: String(data.createdAt ?? ''),
      });
    }
  } catch {
    // Local registry is enough when remote read fails.
  }

  return Array.from(byPhone.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadRegisteredDrivers(): Promise<RegisteredDriver[]> {
  const local = await readDriverMap();
  const byPhone = new Map<string, RegisteredDriver>();

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
    }
  } catch {
    // Local registry is enough when remote read fails.
  }

  return Array.from(byPhone.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadPendingDrivers(): Promise<RegisteredDriver[]> {
  const drivers = await loadRegisteredDrivers();
  return drivers.filter((driver) => driver.approvalStatus === 'pending');
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

  try {
    await setDoc(
      doc(db, 'drivers', target.id),
      {
        approvalStatus,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  } catch {
    // Local registry remains source of truth when remote write fails.
  }

  return updated;
}

export async function approveDriver(driverId: string): Promise<RegisteredDriver> {
  return updateDriverApproval(driverId, 'approved');
}

export async function rejectDriver(driverId: string): Promise<RegisteredDriver> {
  return updateDriverApproval(driverId, 'rejected');
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

  try {
    await setDoc(doc(db, 'drivers', record.id), {
      ...record,
      role: 'driver',
      createdAt: record.registeredAt,
    });
  } catch {
    // Local registry remains source of truth when remote write fails.
  }

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
