import { Alert, Linking } from 'react-native';
import { normalizePhone } from '../constants/auth';

export function resolveDriverCallPhone(order: {
  driver?: { phone?: string } | null;
  assignedDriverPhone?: string;
}): string | null {
  const raw = order.driver?.phone ?? order.assignedDriverPhone;
  if (!raw) return null;
  const digits = normalizePhone(raw);
  return digits.length >= 10 ? digits : null;
}

export async function openPhoneCall(phone: string): Promise<void> {
  const digits = normalizePhone(phone);
  if (digits.length < 10) {
    Alert.alert('Invalid number', 'This phone number cannot be dialed.');
    return;
  }

  const telUrl = `tel:+91${digits}`;
  try {
    await Linking.openURL(telUrl);
  } catch {
    Alert.alert('Unable to call', 'Your device could not open the phone dialer.');
  }
}

export async function callDriver(order: {
  driver?: { phone?: string } | null;
  assignedDriverPhone?: string;
}): Promise<void> {
  const phone = resolveDriverCallPhone(order);
  if (!phone) {
    Alert.alert('No phone number', 'Driver contact number is not available yet.');
    return;
  }
  await openPhoneCall(phone);
}
