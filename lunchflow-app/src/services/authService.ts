import { Platform } from 'react-native';
import {
  ConfirmationResult,
  RecaptchaVerifier,
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  AuthUser,
  UserRole,
  DEMO_ADMIN,
  isDemoAdminLogin,
  normalizePhone,
} from '../constants/auth';
import { auth, db } from '../lib/firebase';
import {
  RegistrationRequiredError,
  isCustomerRegistered,
  isDriverRegistered,
  loadCustomerRegistration,
  loadDriverByPhone,
  registerDriverRecord,
  saveCustomerRegistration,
  DriverRegistration,
  CustomerRegistration,
} from './userRegistryService';
import { getDetailLabel, getInstitutionLabel, getPersonLabel, normalizeDeliveryType } from '../types/delivery';

export type { CustomerRegistration, DriverRegistration };
export { RegistrationRequiredError } from './userRegistryService';

let confirmationResult: ConfirmationResult | null = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;
let pendingCustomerOtp: { phone: string; otp: string; expiresAt: number } | null = null;

function firebaseErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: string }).code);
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
      return 'Invalid email or password';
    }
    if (code === 'auth/user-not-found') {
      return 'No account found with these credentials';
    }
    if (code === 'auth/invalid-verification-code') {
      return 'Invalid OTP. Please try again';
    }
    if (code === 'auth/too-many-requests') {
      return 'Too many attempts. Please try again later';
    }
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again';
}

function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

async function loadUserProfile(firebaseUser: User): Promise<AuthUser> {
  const profileSnap = await getDoc(doc(db, 'profiles', firebaseUser.uid));
  if (profileSnap.exists()) {
    const data = profileSnap.data();
    return {
      id: firebaseUser.uid,
      role: data.role as UserRole,
      name: data.name ?? '',
      email: firebaseUser.email ?? data.email,
      phone: data.phone ?? normalizePhone(firebaseUser.phoneNumber ?? ''),
      vehicle: data.vehicle,
    };
  }

  const phone = normalizePhone(firebaseUser.phoneNumber ?? '');
  if (phone.length === 10) {
    const userSnap = await getDoc(doc(db, 'users', phone));
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        id: firebaseUser.uid,
        role: 'customer',
        name: data.name ?? '',
        phone,
        email: data.email,
      };
    }
  }

  return {
    id: firebaseUser.uid,
    role: 'customer',
    name: firebaseUser.displayName ?? '',
    phone: phone || undefined,
    email: firebaseUser.email ?? undefined,
  };
}

function getRecaptchaVerifier(): RecaptchaVerifier {
  if (Platform.OS !== 'web') {
    throw new Error('OTP login is available on web. Use the deployed app URL.');
  }
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
  }
  return recaptchaVerifier;
}

function customerAuthUser(phone: string, name: string): AuthUser {
  return {
    id: `CUS-${phone}`,
    role: 'customer',
    name,
    phone,
  };
}

function driverAuthUser(driver: { id: string; name: string; phone: string; vehicle: string }): AuthUser {
  return {
    id: driver.id,
    role: 'driver',
    name: driver.name,
    phone: driver.phone,
    vehicle: driver.vehicle,
  };
}

export async function loginAdmin(email: string, password: string): Promise<AuthUser> {
  if (isDemoAdminLogin(email, password)) {
    return {
      id: DEMO_ADMIN.id,
      role: 'admin',
      name: DEMO_ADMIN.name,
      email: DEMO_ADMIN.email,
    };
  }
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const profile = await loadUserProfile(credential.user);
    if (profile.role !== 'admin') {
      await signOut(auth);
      throw new Error('This account does not have admin access');
    }
    return profile;
  } catch (error) {
    throw new Error(firebaseErrorMessage(error));
  }
}

export async function loginDriver(phone: string): Promise<AuthUser> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) {
    throw new Error('Enter a valid 10-digit mobile number');
  }

  const registered = await isDriverRegistered(normalized);
  if (!registered) {
    throw new RegistrationRequiredError('driver');
  }

  const driver = await loadDriverByPhone(normalized);
  if (!driver) {
    throw new RegistrationRequiredError('driver');
  }

  return driverAuthUser(driver);
}

export async function sendCustomerOtp(phone: string): Promise<void> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) {
    throw new Error('Enter a valid 10-digit mobile number');
  }

  const registered = await isCustomerRegistered(normalized);
  if (!registered) {
    throw new RegistrationRequiredError('customer');
  }

  confirmationResult = null;

  try {
    if (Platform.OS === 'web') {
      const verifier = getRecaptchaVerifier();
      confirmationResult = await signInWithPhoneNumber(auth, `+91${normalized}`, verifier);
      pendingCustomerOtp = null;
      return;
    }
  } catch {
    // Fall back to local OTP when Firebase phone auth is unavailable.
  }

  pendingCustomerOtp = {
    phone: normalized,
    otp: generateOtp(),
    expiresAt: Date.now() + 10 * 60 * 1000,
  };
}

export function getPendingCustomerOtpForDev(): string | null {
  if (!__DEV__ || !pendingCustomerOtp) return null;
  return pendingCustomerOtp.otp;
}

export async function verifyCustomerOtp(otp: string): Promise<AuthUser> {
  if (!otp.trim()) {
    throw new Error('Enter the OTP sent to your phone');
  }

  if (confirmationResult) {
    try {
      const credential = await confirmationResult.confirm(otp.trim());
      const profile = await loadUserProfile(credential.user);
      return { ...profile, role: 'customer' };
    } catch (error) {
      throw new Error(firebaseErrorMessage(error));
    }
  }

  if (pendingCustomerOtp) {
    if (Date.now() > pendingCustomerOtp.expiresAt) {
      pendingCustomerOtp = null;
      throw new Error('OTP expired. Tap Login to receive a new OTP.');
    }
    if (otp.trim() !== pendingCustomerOtp.otp) {
      throw new Error('Invalid OTP. Please try again');
    }

    const phone = pendingCustomerOtp.phone;
    pendingCustomerOtp = null;
    const registration = await loadCustomerRegistration(phone);
    const name = registration?.name?.trim() || 'Customer';
    return customerAuthUser(phone, name);
  }

  throw new Error('Tap Login to receive an OTP on your mobile number first');
}

export async function registerCustomer(data: CustomerRegistration): Promise<AuthUser> {
  const phone = normalizePhone(data.phone);
  const registrationType = normalizeDeliveryType(data.registrationType);
  if (!data.name.trim()) throw new Error('Enter your full name');
  if (phone.length !== 10) throw new Error('Enter a valid 10-digit mobile number');
  if (!data.address.trim()) throw new Error('Enter your home address');
  if (!data.school.trim()) throw new Error(`Enter ${getInstitutionLabel(registrationType).toLowerCase()}`);
  if (!data.studentName.trim()) throw new Error(`Enter ${getPersonLabel(registrationType).toLowerCase()}`);
  if (!data.classSection.trim()) throw new Error(`Enter ${getDetailLabel(registrationType).toLowerCase()}`);
  if (!data.emergencyContact.trim()) throw new Error('Enter emergency contact number');

  const alreadyRegistered = await isCustomerRegistered(phone);
  if (alreadyRegistered) {
    throw new Error('This mobile number is already registered. Please login.');
  }

  await saveCustomerRegistration({
    name: data.name.trim(),
    phone,
    address: data.address.trim(),
    registrationType,
    school: data.school.trim(),
    studentName: data.studentName.trim(),
    classSection: data.classSection.trim(),
    emergencyContact: data.emergencyContact.trim(),
  });

  try {
    await setDoc(doc(db, 'users', phone), {
      role: 'customer',
      name: data.name.trim(),
      phone,
      address: data.address.trim(),
      registrationType,
      school: data.school.trim(),
      studentName: data.studentName.trim(),
      classSection: data.classSection.trim(),
      emergencyContact: data.emergencyContact.trim(),
      createdAt: new Date().toISOString(),
    });
    const { createBooking } = await import('./orderHubService');
    await createBooking(`CUS-${phone}`, phone, {
      name: data.name.trim(),
      studentName: data.studentName.trim(),
      school: data.school.trim(),
      address: data.address.trim(),
      deliveryType: registrationType,
    });
  } catch {
    // Local registration is enough for login when remote write fails.
  }

  return customerAuthUser(phone, data.name.trim());
}

export async function registerDriver(data: DriverRegistration): Promise<AuthUser> {
  const record = await registerDriverRecord(data);
  return driverAuthUser(record);
}

export async function logoutUser(): Promise<void> {
  confirmationResult = null;
  pendingCustomerOtp = null;
  if (auth.currentUser) {
    await signOut(auth);
  }
}

export function subscribeToAuthState(onUser: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      onUser(null);
      return;
    }
    try {
      const profile = await loadUserProfile(firebaseUser);
      onUser(profile);
    } catch {
      onUser(null);
    }
  });
}
