import { Linking, Platform } from 'react-native';
import { GeoPoint } from '../types/delivery';

export function buildGoogleMapsDirectionsUrl(destination: GeoPoint, origin?: GeoPoint): string {
  const dest = `${destination.lat},${destination.lng}`;
  if (origin) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest}&travelmode=driving`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
}

export async function openMapsNavigation(destination: GeoPoint, origin?: GeoPoint): Promise<boolean> {
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
