import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';
import { GeoPoint } from '../types/delivery';
import { reverseGeocodeAsync } from './mapGeocoding';

function promptTurnOnLocation(): void {
  Alert.alert(
    'Turn on location',
    'Please turn on location access so LunchFlow can fill your pickup address automatically.',
    Platform.OS === 'web'
      ? [{ text: 'OK' }]
      : [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ],
  );
}

async function getCustomerDeviceLocation(): Promise<GeoPoint | null> {
  if (Platform.OS === 'web') {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) return null;

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    return null;
  }
}

type FetchCustomerAddressOptions = {
  /** Shows a turn-on-location prompt when GPS or permission fails. */
  promptOnFailure?: boolean;
};

export async function fetchCustomerAddressFromGps(
  options: FetchCustomerAddressOptions = {},
): Promise<string | null> {
  const point = await getCustomerDeviceLocation();
  if (!point) {
    if (options.promptOnFailure) promptTurnOnLocation();
    return null;
  }

  const address = await reverseGeocodeAsync(point);
  if (!address && options.promptOnFailure) {
    Alert.alert(
      'Location unavailable',
      'Could not read an address for your current location. Enter your pickup address manually.',
    );
  }
  return address;
}
