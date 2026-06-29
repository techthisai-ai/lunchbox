import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';
import { normalizePhone } from '../constants/auth';
import { syncDocument } from './firestoreSync';

export const SUPPORT_PHONE_DISPLAY = '1800-LUNCH-FLOW';
export const SUPPORT_PHONE_DIAL = '18005864356';
export const SUPPORT_WHATSAPP_PHONE = '919876543210';

export type SupportFaq = {
  id: string;
  question: string;
  answer: string;
};

export const SUPPORT_FAQS: SupportFaq[] = [
  {
    id: 'food-ready',
    question: 'How do I mark food as ready?',
    answer:
      'Open Home, tap Mark Food Ready, enter pickup address and student delivery details, then confirm. Your driver will be notified once food is ready.',
  },
  {
    id: 'driver-delay',
    question: 'What if my driver is delayed?',
    answer:
      'Go to Track on the home screen to see live status and ETA. You can call the driver from the tracking page. If you still need help, use Call Support on this page.',
  },
  {
    id: 'change-address',
    question: 'How to change delivery address?',
    answer:
      'Update drop locations when you mark food ready for each student. Your saved pickup and delivery addresses are available under Profile > Saved Addresses.',
  },
];

export type SupportComplaint = {
  id: string;
  customerPhone: string;
  customerName: string;
  message: string;
  status: 'open';
  createdAt: string;
};

function complaintsKey(phone: string): string {
  return `@lunchflow_support_complaints_${normalizePhone(phone)}`;
}

export async function openSupportCall(): Promise<void> {
  const telUrl = `tel:${SUPPORT_PHONE_DIAL}`;
  try {
    const canOpen = await Linking.canOpenURL(telUrl);
    if (!canOpen) {
      Alert.alert('Unable to call', `Please dial ${SUPPORT_PHONE_DISPLAY} from your phone.`);
      return;
    }
    await Linking.openURL(telUrl);
  } catch {
    Alert.alert('Unable to call', `Please dial ${SUPPORT_PHONE_DISPLAY} from your phone.`);
  }
}

export async function openSupportChat(customerName?: string, customerPhone?: string): Promise<void> {
  const greeting = customerName ? `Hi, I'm ${customerName}.` : 'Hi LunchFlow Support,';
  const phonePart = customerPhone ? ` My registered number is ${customerPhone}.` : '';
  const message = encodeURIComponent(`${greeting} I need help with my lunchbox delivery.${phonePart}`);
  const appUrl = `whatsapp://send?phone=${SUPPORT_WHATSAPP_PHONE}&text=${message}`;
  const webUrl = `https://wa.me/${SUPPORT_WHATSAPP_PHONE}?text=${message}`;

  try {
    const canOpenApp = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpenApp ? appUrl : webUrl);
  } catch {
    try {
      await Linking.openURL(webUrl);
    } catch {
      Alert.alert('Unable to open chat', 'WhatsApp is not available on this device.');
    }
  }
}

export async function submitSupportComplaint(input: {
  customerPhone: string;
  customerName: string;
  message: string;
}): Promise<SupportComplaint> {
  const phone = normalizePhone(input.customerPhone);
  const message = input.message.trim();
  if (phone.length !== 10) throw new Error('Log in with a valid mobile number to raise a complaint.');
  if (message.length < 10) throw new Error('Please describe your issue in at least 10 characters.');

  const complaint: SupportComplaint = {
    id: `CMP-${Date.now()}`,
    customerPhone: phone,
    customerName: input.customerName.trim() || 'Customer',
    message,
    status: 'open',
    createdAt: new Date().toISOString(),
  };

  const key = complaintsKey(phone);
  const existingRaw = await AsyncStorage.getItem(key);
  const existing = existingRaw ? (JSON.parse(existingRaw) as SupportComplaint[]) : [];
  const next = [complaint, ...existing].slice(0, 20);
  await AsyncStorage.setItem(key, JSON.stringify(next));
  await syncDocument('support_complaints', complaint.id, complaint as unknown as Record<string, unknown>);

  return complaint;
}
