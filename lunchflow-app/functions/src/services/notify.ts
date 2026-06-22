import { getFirestore } from 'firebase-admin/firestore';
import { DEFAULT_PREFS, normalizePhone, OrderDoc, UserDoc } from '../config';
import { buildDriverAssignmentMessage, buildStatusMessage, StatusMessage } from '../templates/orderStatus';
import { logDeliveryAttempt, markSent, wasAlreadySent, writeInboxNotification } from './inbox';
import { sendExpoPush } from './push';
import { sendSms } from './sms';
import { sendOrderWhatsApp } from './whatsapp';

async function loadUser(phone: string): Promise<UserDoc | null> {
  const db = getFirestore();
  const snap = await db.collection('users').doc(phone).get();
  return snap.exists ? (snap.data() as UserDoc) : null;
}

async function loadDriverPhone(order: OrderDoc): Promise<string | null> {
  if (order.assignedDriverPhone) return normalizePhone(order.assignedDriverPhone);
  const driverId = order.driver?.id;
  if (!driverId) return null;
  const db = getFirestore();
  const snap = await db.collection('drivers').doc(driverId).get();
  if (!snap.exists) return null;
  const phone = snap.data()?.phone;
  return phone ? normalizePhone(String(phone)) : null;
}

async function dispatchChannel(
  channel: 'sms' | 'whatsapp' | 'push',
  phone: string,
  message: StatusMessage,
  order: OrderDoc,
  status: string,
  expoPushToken?: string | null,
): Promise<void> {
  const orderId = order.id ?? 'unknown';
  if (await wasAlreadySent(orderId, status, `${channel}:${phone}`)) return;

  if (channel === 'sms') {
    const result = await sendSms(phone, message.sms);
    await logDeliveryAttempt({ orderId, status, channel, phone, ok: result.ok, error: result.error, provider: result.provider });
    if (result.ok) await markSent(orderId, status, `${channel}:${phone}`);
    return;
  }

  if (channel === 'whatsapp') {
    const result = await sendOrderWhatsApp(phone, message.whatsapp, message.title);
    await logDeliveryAttempt({ orderId, status, channel, phone, ok: result.ok, error: result.error });
    if (result.ok) await markSent(orderId, status, `${channel}:${phone}`);
    return;
  }

  if (!expoPushToken) {
    await logDeliveryAttempt({ orderId, status, channel, phone, ok: false, error: 'Missing push token' });
    return;
  }

  const result = await sendExpoPush(expoPushToken, {
    title: message.title,
    body: message.push,
    data: { orderId, status },
  });
  await logDeliveryAttempt({ orderId, status, channel, phone, ok: result.ok, error: result.error });
  if (result.ok) await markSent(orderId, status, `${channel}:${phone}`);
}

export async function notifyOrderStatusChange(before: OrderDoc | undefined, after: OrderDoc): Promise<void> {
  const previousStatus = before?.status;
  const nextStatus = after.status;
  if (!nextStatus || previousStatus === nextStatus) return;

  const customerPhone = normalizePhone(after.customerPhone ?? '');
  if (customerPhone.length !== 10) return;

  const message = buildStatusMessage(nextStatus, after);
  if (!message) return;

  const user = await loadUser(customerPhone);
  const prefs = { ...DEFAULT_PREFS, ...(user?.notificationPrefs ?? {}) };

  if (prefs.sms) {
    await dispatchChannel('sms', customerPhone, message, after, nextStatus);
  }
  if (prefs.whatsapp) {
    await dispatchChannel('whatsapp', customerPhone, message, after, nextStatus);
  }
  if (prefs.push) {
    await dispatchChannel('push', customerPhone, message, after, nextStatus, user?.expoPushToken);
  }

  await writeInboxNotification(customerPhone, message, {
    orderId: after.id ?? 'unknown',
    status: nextStatus,
    channel: 'all',
  });

  if (nextStatus === 'driver_assigned') {
    const driverPhone = await loadDriverPhone(after);
    if (!driverPhone) return;

    const driverMessage = buildDriverAssignmentMessage(after);
    const driverUser = await loadUser(driverPhone);
    const driverPrefs = { ...DEFAULT_PREFS, ...(driverUser?.notificationPrefs ?? {}) };

    if (driverPrefs.sms) {
      await dispatchChannel('sms', driverPhone, driverMessage, after, `${nextStatus}:driver`, null);
    }
    if (driverPrefs.whatsapp) {
      await dispatchChannel('whatsapp', driverPhone, driverMessage, after, `${nextStatus}:driver`, null);
    }
    if (driverPrefs.push) {
      await dispatchChannel('push', driverPhone, driverMessage, after, `${nextStatus}:driver`, driverUser?.expoPushToken);
    }
  }
}
