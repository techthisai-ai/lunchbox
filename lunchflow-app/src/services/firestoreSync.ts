import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function syncDocument<T extends Record<string, unknown>>(
  collection: string,
  id: string,
  data: T,
): Promise<void> {
  try {
    await setDoc(doc(db, collection, id), { ...data, updatedAt: new Date().toISOString() }, { merge: true });
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
