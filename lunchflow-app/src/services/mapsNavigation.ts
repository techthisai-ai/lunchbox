import { Linking, Platform } from 'react-native';
import { GeoPoint } from '../types/delivery';

function formatAddressForMaps(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return 'Chennai, Tamil Nadu, India';
  const lower = trimmed.toLowerCase();
  if (lower.includes('tamil nadu') || lower.includes(', india')) return trimmed;
  return `${trimmed}, Tamil Nadu, India`;
}

export function buildGoogleMapsDirectionsUrlFromAddress(destinationAddress: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(formatAddressForMaps(destinationAddress))}&travelmode=driving`;
}

export function buildGoogleMapsDirectionsUrl(destination: GeoPoint, origin?: GeoPoint): string {
  const dest = `${destination.lat},${destination.lng}`;
  if (origin) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
}

export async function openMapsNavigationToAddress(destinationAddress: string): Promise<boolean> {
  const trimmed = destinationAddress.trim();
  if (!trimmed) return false;

  const webUrl = buildGoogleMapsDirectionsUrlFromAddress(trimmed);

  if (Platform.OS === 'ios') {
    const appleUrl = `http://maps.apple.com/?daddr=${encodeURIComponent(formatAddressForMaps(trimmed))}&dirflg=d`;
    try {
      await Linking.openURL(appleUrl);
      return true;
    } catch {
      // Fall through.
    }
  }

  try {
    await Linking.openURL(webUrl);
    return true;
  } catch {
    return false;
  }
}

export async function openMapsNavigation(
  destination: GeoPoint,
  origin?: GeoPoint,
  addressHint?: string,
): Promise<boolean> {
  if (addressHint?.trim()) {
    return openMapsNavigationToAddress(addressHint);
  }

  const webUrl = buildGoogleMapsDirectionsUrl(destination, origin);

  if (Platform.OS === 'ios') {
    const appleUrl = origin
      ? `http://maps.apple.com/?saddr=${origin.lat},${origin.lng}&daddr=${destination.lat},${destination.lng}&dirflg=d`
      : `http://maps.apple.com/?daddr=${destination.lat},${destination.lng}&dirflg=d`;
    try {
      await Linking.openURL(appleUrl);
      return true;
    } catch {
      // Fall through.
    }
  }

  try {
    await Linking.openURL(webUrl);
    return true;
  } catch {
    return false;
  }
}
