import { Platform } from 'react-native';

const ORDER_CHANGE_EVENT = 'lunchflow-order-change';

export function emitOrderChange(): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ORDER_CHANGE_EVENT));
  }
}

export function subscribeToOrderChanges(listener: () => void): () => void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener(ORDER_CHANGE_EVENT, listener);
    return () => window.removeEventListener(ORDER_CHANGE_EVENT, listener);
  }
  return () => {};
}
