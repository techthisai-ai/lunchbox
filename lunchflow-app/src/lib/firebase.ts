import { Platform } from 'react-native';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const WEB_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBMf_YlehISPQsIJvD-N3HlygVQyTkZrnM',
  authDomain: 'lunchbox-b660d.firebaseapp.com',
  projectId: 'lunchbox-b660d',
  storageBucket: 'lunchbox-b660d.firebasestorage.app',
  messagingSenderId: '799862263361',
  appId: '1:799862263361:web:7b0efb1487ab65a7f5c0c0',
  measurementId: 'G-QKY81W5JZG',
};

const NATIVE_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCl3Jab_BsuKVzKypKT42cp9qkIHdaHFNM',
  authDomain: 'lunchbox-b660d.firebaseapp.com',
  projectId: 'lunchbox-b660d',
  storageBucket: 'lunchbox-b660d.firebasestorage.app',
  messagingSenderId: '799862263361',
  appId: '1:799862263361:android:c54bece7eb54f7d5f5c0c0',
};

const firebaseConfig = Platform.OS === 'web' ? WEB_FIREBASE_CONFIG : NATIVE_FIREBASE_CONFIG;

function getOrCreateApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

function createAuth(app: FirebaseApp): Auth {
  return getAuth(app);
}

function isMobileWebBrowser(): boolean {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

/** Mobile browsers often block Firestore WebSockets; long polling fixes empty reads. */
function createDb(app: FirebaseApp): Firestore {
  if (isMobileWebBrowser()) {
    try {
      return initializeFirestore(app, {
        experimentalForceLongPolling: true,
      });
    } catch {
      return getFirestore(app);
    }
  }
  return getFirestore(app);
}

export const app: FirebaseApp = getOrCreateApp();
export const auth: Auth = createAuth(app);
export const db: Firestore = createDb(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app, 'asia-south1');

/** Analytics only runs on web (not supported in React Native). */
export async function initAnalytics() {
  if (Platform.OS !== 'web') return null;

  const { getAnalytics, isSupported } = await import('firebase/analytics');
  const supported = await isSupported();
  if (!supported) return null;

  return getAnalytics(app);
}
