import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Platform } from 'react-native';
import { AuthUser, normalizePhone } from '../constants/auth';
import { auth, storage } from '../lib/firebase';
import {
  CustomerRegistration,
  loadCustomerRegistration,
  updateCustomerRegistration,
} from './userRegistryService';
import { persistAuthSession } from './authService';

export type CustomerProfileUpdate = {
  name?: string;
  email?: string;
  avatarUrl?: string;
  emergencyContact?: string;
  studentName?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_AVATAR_BYTES = 280_000;

export function validateProfileName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Full name is required';
  if (trimmed.length < 2) return 'Name must be at least 2 characters';
  return null;
}

export function validateProfileEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return null;
  if (!EMAIL_PATTERN.test(trimmed)) return 'Enter a valid email address';
  return null;
}

export function validateEmergencyContact(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const normalized = normalizePhone(trimmed);
  if (normalized.length !== 10) return 'Enter a valid 10-digit emergency contact number';
  return null;
}

async function readPhotoBlob(localUri: string): Promise<Blob> {
  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error('Could not read the selected photo.');
  }
  return response.blob();
}

async function compressAvatarBlob(blob: Blob): Promise<Blob> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return blob.size <= MAX_AVATAR_BYTES ? blob : blob;
  }

  try {
    const bitmap = await createImageBitmap(blob);
    const maxDim = 512;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const compressed = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('Could not compress photo'))),
        'image/jpeg',
        0.82,
      );
    });

    return compressed.size < blob.size ? compressed : blob;
  } catch {
    return blob;
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read photo'));
    reader.readAsDataURL(blob);
  });
}

export async function uploadCustomerAvatar(phone: string, localUri: string): Promise<string> {
  const normalized = normalizePhone(phone);
  const blob = await readPhotoBlob(localUri);
  const compressed = await compressAvatarBlob(blob);

  if (auth.currentUser) {
    try {
      const fileName = `${Date.now()}.jpg`;
      const storageRef = ref(storage, `customer-avatars/${normalized}/${fileName}`);
      await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' });
      return getDownloadURL(storageRef);
    } catch {
      // Fall back to inline data URL when Storage rules/auth block the upload.
    }
  }

  const dataUrl = await blobToDataUrl(compressed);
  if (dataUrl.length > 900_000) {
    throw new Error('Photo is too large. Choose a smaller image.');
  }
  return dataUrl;
}

export async function pickProfileImageUri(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return null;
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg,image/png,image/webp,image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }
        resolve(URL.createObjectURL(file));
      };
      input.click();
    });
  }

  const ImagePicker = await import('expo-image-picker');
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to update your profile picture.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.82,
  });

  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}

export async function loadCustomerProfileRecord(phone: string): Promise<CustomerRegistration | null> {
  return loadCustomerRegistration(normalizePhone(phone));
}

export function customerAuthUserFromRegistration(registration: CustomerRegistration): AuthUser {
  const phone = normalizePhone(registration.phone);
  return {
    id: `CUS-${phone}`,
    role: 'customer',
    name: registration.name.trim() || 'Customer',
    phone,
    email: registration.email?.trim() || undefined,
    avatarUrl: registration.avatarUrl || undefined,
  };
}

export async function updateCustomerProfile(
  phone: string,
  fields: CustomerProfileUpdate,
): Promise<{ registration: CustomerRegistration; user: AuthUser }> {
  const normalized = normalizePhone(phone);
  const nameError = fields.name != null ? validateProfileName(fields.name) : null;
  if (nameError) throw new Error(nameError);

  const emailError = fields.email != null ? validateProfileEmail(fields.email) : null;
  if (emailError) throw new Error(emailError);

  const emergencyError =
    fields.emergencyContact != null ? validateEmergencyContact(fields.emergencyContact) : null;
  if (emergencyError) throw new Error(emergencyError);

  const patch: Partial<CustomerRegistration> = {};
  if (fields.name != null) patch.name = fields.name.trim();
  if (fields.email != null) patch.email = fields.email.trim();
  if (fields.avatarUrl != null) patch.avatarUrl = fields.avatarUrl;
  if (fields.emergencyContact != null) patch.emergencyContact = normalizePhone(fields.emergencyContact);
  if (fields.studentName != null) patch.studentName = fields.studentName.trim();

  const registration = await updateCustomerRegistration(normalized, patch);
  const user = customerAuthUserFromRegistration(registration);
  await persistAuthSession(user);
  return { registration, user };
}

export async function refreshCustomerAuthUser(phone: string): Promise<AuthUser | null> {
  const registration = await loadCustomerRegistration(normalizePhone(phone));
  if (!registration) return null;
  return customerAuthUserFromRegistration(registration);
}
