import { Alert, Platform } from 'react-native';

/** Reliable alert on web and native — RN Alert is easy to miss on web. */
export function showCheckoutAlert(title: string, message: string): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
