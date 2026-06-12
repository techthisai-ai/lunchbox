import { useEffect } from 'react';
import { initAnalytics } from '../lib/firebase';

/** Initializes Firebase Analytics on web at app startup. */
export function useFirebaseInit() {
  useEffect(() => {
    initAnalytics().catch(() => {
      // Analytics is optional; fail silently on unsupported environments.
    });
  }, []);
}
