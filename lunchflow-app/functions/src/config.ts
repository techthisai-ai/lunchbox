export type OrderStatus =
  | 'booked'
  | 'food_ready'
  | 'awaiting_driver'
  | 'driver_assigned'
  | 'at_pickup'
  | 'pickup_verified'
  | 'picked_up'
  | 'in_transit'
  | 'at_drop'
  | 'delivered'
  | 'pickup_closed';

export type NotificationPreferences = {
  push: boolean;
  sms: boolean;
  whatsapp: boolean;
};

export type OrderDoc = {
  id?: string;
  customerPhone?: string;
  customerName?: string;
  studentName?: string;
  school?: string;
  pickupAddress?: string;
  dropAddress?: string;
  status?: OrderStatus;
  pickupOtp?: string;
  driver?: { id?: string; name?: string; vehicle?: string };
  assignedDriverPhone?: string;
  estimatedArrival?: string | null;
  deliveredAt?: string | null;
};

export type UserDoc = {
  phone?: string;
  name?: string;
  notificationPrefs?: NotificationPreferences;
  expoPushToken?: string | null;
  fcmToken?: string | null;
};

export const DEFAULT_PREFS: NotificationPreferences = {
  push: true,
  sms: true,
  whatsapp: true,
};

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

export function smsProvider(): 'msg91' | 'twilio' | 'console' {
  const value = (process.env.SMS_PROVIDER ?? 'console').toLowerCase();
  if (value === 'msg91' || value === 'twilio') return value;
  return 'console';
}

export function whatsappConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}
