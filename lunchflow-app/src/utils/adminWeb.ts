import { Linking, Platform } from 'react-native';

const ADMIN_HOST_PREFIXES = ['admin.', 'admin-'];

function isAdminHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return ADMIN_HOST_PREFIXES.some((prefix) => host.startsWith(prefix));
}

/** True when the web app should boot the Admin Portal (email/password), not the mobile app. */
export function isAdminWebEntry(): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;

  const { hostname, pathname } = window.location;
  if (isAdminHostname(hostname)) return true;

  const path = pathname.replace(/\/$/, '') || '/';
  return path === '/admin' || path.startsWith('/admin/');
}

export function isWebPlatform(): boolean {
  return Platform.OS === 'web';
}

export function getAdminWebUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { hostname, origin, protocol } = window.location;
    if (isAdminHostname(hostname)) {
      return origin;
    }
    // Prefer dedicated admin subdomain when on production-style hosts.
    if (hostname === 'lunchflow.com' || hostname === 'www.lunchflow.com') {
      return `${protocol}//admin.lunchflow.com`;
    }
    return `${origin}/admin`;
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
