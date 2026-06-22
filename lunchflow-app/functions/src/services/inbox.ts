import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { StatusMessage } from '../templates/orderStatus';

export async function writeInboxNotification(
  phone: string,
  message: StatusMessage,
  meta: { orderId: string; status: string; channel: 'sms' | 'whatsapp' | 'push' | 'all' },
): Promise<void> {
  const db = getFirestore();
  const ref = db.collection('users').doc(phone).collection('notifications').doc();
  await ref.set({
    icon: 'notifications',
    title: message.title,
    msg: message.push,
    orderId: meta.orderId,
    status: meta.status,
    channel: meta.channel,
    createdAt: FieldValue.serverTimestamp(),
    read: false,
  });
}

export async function logDeliveryAttempt(input: {
  orderId: string;
  status: string;
  channel: 'sms' | 'whatsapp' | 'push';
  phone: string;
  ok: boolean;
  error?: string;
  provider?: string;
}): Promise<void> {
  const db = getFirestore();
  await db.collection('message_logs').add({
    ...input,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function wasAlreadySent(orderId: string, status: string, channel: string): Promise<boolean> {
  const db = getFirestore();
  const id = `${orderId}_${status}_${channel}`;
  const ref = db.collection('notificationDeliveries').doc(id);
  const snap = await ref.get();
  return snap.exists;
}

export async function markSent(orderId: string, status: string, channel: string): Promise<void> {
  const db = getFirestore();
  const id = `${orderId}_${status}_${channel}`;
  await db.collection('notificationDeliveries').doc(id).set({
    orderId,
    status,
    channel,
    sentAt: FieldValue.serverTimestamp(),
  });
}
