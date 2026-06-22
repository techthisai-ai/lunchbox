import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { normalizePhone } from '../constants/auth';
import { syncNotificationProfile } from './customerPreferencesService';

if (Platform.OS !== 'web') {
  // Native-only: avoid breaking web bundle when notification modules fail to resolve.
  const Notifications = require('expo-notifications') as typeof import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotifications(phone: string, name?: string): Promise<string | null> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return null;

  if (Platform.OS === 'web') {
    await syncNotificationProfile(normalized, { name, expoPushToken: null });
    return null;
  }

  const Device = require('expo-device') as typeof import('expo-device');
  const Notifications = require('expo-notifications') as typeof import('expo-notifications');

  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    await syncNotificationProfile(normalized, { name, expoPushToken: null });
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('order-updates', {
      name: 'Order Updates',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFD6E8',
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.slug;

  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId: String(projectId) } : undefined,
  );
  const token = tokenResponse.data;

  await syncNotificationProfile(normalized, { name, expoPushToken: token });
  return token;
}

export function addNotificationResponseListener(
  listener: (response: import('expo-notifications').NotificationResponse) => void,
): import('expo-notifications').EventSubscription {
  if (Platform.OS === 'web') {
    return { remove: () => {} };
  }
  const Notifications = require('expo-notifications') as typeof import('expo-notifications');
  return Notifications.addNotificationResponseReceivedListener(listener);
}
