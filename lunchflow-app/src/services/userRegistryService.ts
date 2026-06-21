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

export type RegisteredDriver = {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  licenseNumber: string;
  status: 'Available' | 'On Route' | 'Offline';
};

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
    byPhone.set(normalizePhone(driver.phone), driver);
  }

  try {
    const snap = await getDocs(collection(db, 'drivers'));
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const phone = normalizePhone(String(data.phone ?? ''));
      if (phone.length !== 10) continue;
      byPhone.set(phone, {
        id: String(data.id ?? docSnap.id),
        name: String(data.name ?? ''),
        phone,
        vehicle: String(data.vehicle ?? ''),
        licenseNumber: String(data.licenseNumber ?? ''),
        status: data.status === 'On Route' || data.status === 'Offline' ? data.status : 'Available',
      });
    }
  } catch {
    // Local registry is enough when remote read fails.
  }

  return Array.from(byPhone.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadDriverByPhone(phone: string): Promise<RegisteredDriver | null> {
  const normalized = normalizePhone(phone);
  const local = await readDriverMap();
  return local[normalized] ?? null;
}

export async function registerDriverRecord(data: DriverRegistration): Promise<RegisteredDriver> {
  const phone = normalizePhone(data.phone);
  if (phone.length !== 10) throw new Error('Enter a valid 10-digit mobile number');
  if (!data.name.trim()) throw new Error('Enter driver full name');
  if (!data.vehicle.trim()) throw new Error('Enter vehicle number');
  if (!data.licenseNumber.trim()) throw new Error('Enter driving license number');

  const existing = await isDriverRegistered(phone);
  if (existing) {
    throw new Error('This mobile number is already registered as a driver');
  }

  const record: RegisteredDriver = {
    id: `DRV-${phone.slice(-4)}-${Date.now().toString().slice(-4)}`,
    name: data.name.trim(),
    phone,
    vehicle: data.vehicle.trim(),
    licenseNumber: data.licenseNumber.trim(),
    status: 'Available',
  };

  const local = await readDriverMap();
  local[phone] = record;
  await AsyncStorage.setItem(DRIVERS_KEY, JSON.stringify(local));

  try {
    await setDoc(doc(db, 'drivers', record.id), {
      ...record,
      role: 'driver',
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Local registry remains source of truth when remote write fails.
  }

  return record;
}
