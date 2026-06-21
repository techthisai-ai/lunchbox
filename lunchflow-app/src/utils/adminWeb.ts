import { Linking, Platform } from 'react-native';

export function isAdminWebEntry(): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  return path === '/admin' || path.startsWith('/admin/');
}

export function isWebPlatform(): boolean {
  return Platform.OS === 'web';
}

export function getAdminWebUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/admin`;
  }
  return 'https://lunchbox-b660d.web.app/admin';
}

export function openAdminWebPortal(): void {
  const url = getAdminWebUrl();
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(url);
    return;
  }
  Linking.openURL(url).catch(() => {
    // Ignore if the device cannot open the browser.
  });
}
