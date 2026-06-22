import { Platform } from 'react-native';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getFunctions, Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyBMf_YlehISPQsIJvD-N3HlygVQyTkZrnM',
  authDomain: 'lunchbox-b660d.firebaseapp.com',
  projectId: 'lunchbox-b660d',
  storageBucket: 'lunchbox-b660d.firebasestorage.app',
  messagingSenderId: '799862263361',
  appId: '1:799862263361:web:7b0efb1487ab65a7f5c0c0',
  measurementId: 'G-QKY81W5JZG',
};

function getOrCreateApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export const app: FirebaseApp = getOrCreateApp();
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const functions: Functions = getFunctions(app, 'asia-south1');

/** Analytics only runs on web (not supported in React Native). */
export async function initAnalytics() {
  if (Platform.OS !== 'web') return null;

  const { getAnalytics, isSupported } = await import('firebase/analytics');
  const supported = await isSupported();
  if (!supported) return null;

  return getAnalytics(app);
}
