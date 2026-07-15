import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Platform } from 'react-native';
import { auth, storage } from '../lib/firebase';

const MAX_WIDTH = 1200;
const JPEG_QUALITY = 0.72;
const UPLOAD_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

async function readPhotoBlob(localUri: string): Promise<Blob> {
  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error('Could not read the selected photo.');
  }
  return response.blob();
}

async function compressPhotoBlob(blob: Blob): Promise<Blob> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return blob;
  }

  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

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
        JPEG_QUALITY,
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

async function uploadCompressedBlob(orderId: string, blob: Blob): Promise<string> {
  const fileName = `${Date.now()}.jpg`;
  const storageRef = ref(storage, `delivery-proofs/${orderId}/${fileName}`);

  await uploadBytes(storageRef, blob, {
    contentType: 'image/jpeg',
  });

  return getDownloadURL(storageRef);
}

export async function uploadDeliveryProofPhoto(orderId: string, localUri: string): Promise<string> {
  const rawBlob = await readPhotoBlob(localUri);
  const blob = await compressPhotoBlob(rawBlob);

  if (!auth.currentUser) {
    const dataUrl = await blobToDataUrl(blob);
    if (dataUrl.length > 900_000) {
      throw new Error('Photo is too large. Sign in again or choose a smaller image.');
    }
    return dataUrl;
  }

  try {
    return await withTimeout(
      uploadCompressedBlob(orderId, blob),
      UPLOAD_TIMEOUT_MS,
      'Photo upload timed out',
    );
  } catch {
    const dataUrl = await blobToDataUrl(blob);
    if (dataUrl.length > 900_000) {
      throw new Error('Photo upload failed. Try a smaller image or check your internet.');
    }
    return dataUrl;
  }
}
