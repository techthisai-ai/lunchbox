/**
 * Order status SMS, WhatsApp, and device push are delivered by Firebase Cloud Functions
 * (`onOrderStatusChange`) when an order document status changes in Firestore.
 *
 * This module keeps a lightweight local inbox entry so the UI updates immediately.
 */
import { pushNotification } from './notificationService';
import { loadNotificationPreferences } from './customerPreferencesService';

export async function sendCustomerSmsAndWhatsApp(
  phone: string,
  smsText: string,
  whatsappText: string,
): Promise<void> {
  const prefs = await loadNotificationPreferences(phone);
  const message = smsText || whatsappText;

  if (prefs.push || prefs.sms || prefs.whatsapp) {
    await pushNotification(phone, {
      icon: 'notifications',
      title: 'Order Update',
      msg: message,
    });
  }
}

export async function sendDriverAssignmentNotification(
  driverPhone: string,
  order: { id: string; customerName: string; studentName: string; pickupAddress: string; school: string; customerPhone: string },
): Promise<void> {
  await pushNotification(driverPhone, {
    icon: 'bicycle',
    title: 'New Pickup Assigned',
    msg: `${order.customerName} · ${order.studentName} · Pickup: ${order.pickupAddress}`,
  });
}
