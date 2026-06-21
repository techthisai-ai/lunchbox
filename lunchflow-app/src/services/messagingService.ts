import { pushNotification } from './notificationService';
import { DeliveryOrder } from '../types/delivery';
import { loadNotificationPreferences } from './customerPreferencesService';

export async function sendCustomerSmsAndWhatsApp(
  phone: string,
  smsText: string,
  whatsappText: string,
): Promise<void> {
  const prefs = await loadNotificationPreferences(phone);

  if (prefs.sms) {
    await pushNotification(phone, {
      icon: 'notifications',
      title: 'SMS Update',
      msg: smsText,
    });
  }

  if (prefs.whatsapp) {
    await pushNotification(phone, {
      icon: 'checkmark-circle',
      title: 'WhatsApp Update',
      msg: whatsappText,
    });
  }

  if (prefs.push) {
    await pushNotification(phone, {
      icon: 'bicycle',
      title: 'Delivery Update',
      msg: smsText,
    });
  }
}

export async function sendDriverAssignmentNotification(
  driverPhone: string,
  order: Pick<DeliveryOrder, 'id' | 'customerName' | 'studentName' | 'pickupAddress' | 'school' | 'customerPhone'>,
): Promise<void> {
  await pushNotification(driverPhone, {
    icon: 'bicycle',
    title: 'New Pickup Assigned',
    msg: `${order.customerName} · ${order.studentName} · Pickup: ${order.pickupAddress}`,
  });
}
