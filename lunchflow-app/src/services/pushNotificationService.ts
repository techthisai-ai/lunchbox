import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { Platform } from 'react-native';
import { normalizePhone } from '../constants/auth';
import { db } from '../lib/firebase';
import { DeliveryOrder, getDropAddress } from '../types/delivery';
import { syncNotificationProfile } from './customerPreferencesService';

if (Platform.OS !== 'web') {
  try {
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
  } catch {
    // Native push may be unavailable until google-services.json is configured.
  }
}

export async function registerForPushNotifications(phone: string, name?: string): Promise<string | null> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return null;

  if (Platform.OS === 'web') {
    try {
      await syncNotificationProfile(normalized, { name, expoPushToken: null });
    } catch {
      // Profile sync is optional when offline or rules block writes.
    }
    return null;
  }

  try {
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
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E45E1A',
        sound: 'default',
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        showBadge: true,
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
  } catch {
    // FCM/google-services may be missing in local APK builds — login must still work.
    try {
      await syncNotificationProfile(normalized, { name, expoPushToken: null });
    } catch {
      // Ignore profile sync failures.
    }
    return null;
  }
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

function deliveredBannerKey(orderId: string): string {
  return `@lunchflow_os_delivered_${orderId}`;
}

export async function markDeliveredBannerShown(orderId: string): Promise<void> {
  if (!orderId) return;
  try {
    await AsyncStorage.setItem(deliveredBannerKey(orderId), '1');
  } catch {
    // Ignore storage failures.
  }
}

export function rememberIncomingDeliveredPush(): () => void {
  if (Platform.OS === 'web') return () => {};
  try {
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as { orderId?: string; status?: string };
      if (data?.status === 'delivered' && data.orderId) {
        void markDeliveredBannerShown(String(data.orderId));
      }
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

function deliveredCopy(order: Pick<DeliveryOrder, 'dropAddress' | 'school' | 'studentEntries' | 'deliveredAt'>): {
  title: string;
  body: string;
} {
  const drop = getDropAddress(order) || order.school || 'your drop location';
  const time = order.deliveredAt ? ` · ${order.deliveredAt}` : '';
  return {
    title: 'Lunchbox Delivered',
    body: `Your lunchbox was delivered at ${drop}${time}.`,
  };
}

async function loadCustomerExpoPushToken(phone: string): Promise<string | null> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return null;

  const readToken = (data: { expoPushToken?: string | null; fcmToken?: string | null } | undefined) => {
    const token = data?.expoPushToken?.trim() || data?.fcmToken?.trim() || '';
    if (token.startsWith('ExponentPushToken') || token.startsWith('ExpoPushToken')) return token;
    return null;
  };

  try {
    const snap = await getDoc(doc(db, 'users', normalized));
    const fromDoc = readToken(snap.data() as { expoPushToken?: string | null; fcmToken?: string | null } | undefined);
    if (fromDoc) return fromDoc;

    const matches = await getDocs(query(collection(db, 'users'), where('phone', '==', normalized), limit(5)));
    for (const row of matches.docs) {
      const token = readToken(row.data() as { expoPushToken?: string | null; fcmToken?: string | null });
      if (token) return token;
    }
  } catch {
    return null;
  }
  return null;
}

async function sendExpoPushToToken(
  expoPushToken: string,
  payload: { title: string; body: string; orderId: string },
): Promise<boolean> {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        data: { orderId: payload.orderId, status: 'delivered' },
        priority: 'high',
        channelId: 'order-updates',
        collapseId: `lunchbox-delivered-${payload.orderId}`,
      }),
    });
    const result = (await response.json()) as {
      data?: { status?: string } | { status?: string }[];
    };
    const ticket = Array.isArray(result.data) ? result.data[0] : result.data;
    return response.ok && ticket?.status !== 'error';
  } catch {
    return false;
  }
}

/** Phone home-screen / lock-screen alert on the customer device (native APK). */
export async function notifyCustomerLunchboxDelivered(order: DeliveryOrder): Promise<void> {
  if (!order.customerPhone || order.status !== 'delivered') return;
  const { title, body } = deliveredCopy(order);
  const token = await loadCustomerExpoPushToken(order.customerPhone);
  if (!token) return;
  await sendExpoPushToToken(token, { title, body, orderId: order.id });
}

/** Banner on the customer phone if the app is open and remote push is delayed. */
export async function presentLunchboxDeliveredBanner(order: DeliveryOrder): Promise<void> {
  if (Platform.OS === 'web' || order.status !== 'delivered') return;
  try {
    const already = await AsyncStorage.getItem(deliveredBannerKey(order.id));
    if (already) return;
    await markDeliveredBannerShown(order.id);

    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    const { title, body } = deliveredCopy(order);
    await Notifications.scheduleNotificationAsync({
      identifier: `lunchbox-delivered-${order.id}`,
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { orderId: order.id, status: 'delivered' },
      },
      trigger: null,
    });
  } catch {
    // Native notifications may be unavailable on web or missing permission.
  }
}
