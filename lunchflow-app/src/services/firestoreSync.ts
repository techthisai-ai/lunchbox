import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function syncDocument<T extends Record<string, unknown>>(
  collection: string,
  id: string,
  data: T,
): Promise<void> {
  try {
    const payload = Object.fromEntries(
      Object.entries({ ...data, updatedAt: new Date().toISOString() }).filter(([, value]) => value !== undefined),
    );
    await setDoc(doc(db, collection, id), payload, { merge: true });
  } catch {
    // Local fallback remains source of truth when remote write fails.
  }
}

export async function loadDocument<T>(collection: string, id: string): Promise<T | null> {
  try {
    const snap = await getDoc(doc(db, collection, id));
    return snap.exists() ? (snap.data() as T) : null;
  } catch {
    return null;
  }
}
