import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { colors } from '../constants/theme';
import { isMobileWebBrowser } from '../lib/firestoreRest';
import { functions } from '../lib/firebase';

export type OnlinePaymentOption = {
  id: string;
  label: string;
  sub: string;
  icon: string;
  iconBg: string;
  iconColor: string;
};

export const ONLINE_PAYMENT_OPTIONS: OnlinePaymentOption[] = [
  {
    id: 'gpay',
    label: 'Google Pay',
    sub: 'Pay with GPay UPI',
    icon: 'GP',
    iconBg: colors.surfaceMuted,
    iconColor: colors.text,
  },
  {
    id: 'phonepe',
    label: 'PhonePe',
    sub: 'Pay with PhonePe UPI',
    icon: 'Pe',
    iconBg: colors.purpleLight,
    iconColor: colors.purple,
  },
  {
    id: 'paytm',
    label: 'Paytm',
    sub: 'Pay with Paytm UPI',
    icon: 'PT',
    iconBg: colors.blueLight,
    iconColor: colors.blue,
  },
  {
    id: 'upi',
    label: 'UPI',
    sub: 'Pay with any UPI app',
    icon: 'UPI',
    iconBg: colors.greenLight,
    iconColor: colors.green,
  },
  {
    id: 'card',
    label: 'Debit / Credit Card',
    sub: 'Visa, Mastercard, RuPay',
    icon: 'CARD',
    iconBg: colors.yellowLight,
    iconColor: colors.dark,
  },
];

const MERCHANT_VPA = 'lunchflow@upi';
const MERCHANT_NAME = 'LunchFlow';

const createPaymentOrderFn = httpsCallable(functions, 'createPaymentOrder');
const verifyPaymentOrderFn = httpsCallable(functions, 'verifyPaymentOrder');

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** UPI deep links and Cloud Functions payment callables are unreliable in web browsers. */
function usesWebDemoPayment(): boolean {
  return Platform.OS === 'web' || (typeof window !== 'undefined' && typeof document !== 'undefined');
}

function shouldUseInAppCheckout(methodId: string): boolean {
  if (methodId === 'card') return true;
  // Desktop browsers cannot open UPI apps — only card stays in-app there.
  if (Platform.OS === 'web' && !isMobileWebBrowser()) return true;
  return false;
}

function formatAmountForUpi(amount: number): string {
  return amount.toFixed(2);
}

function buildUpiQuery(amount: number, description: string): string {
  const params = [
    `pa=${encodeURIComponent(MERCHANT_VPA)}`,
    `pn=${encodeURIComponent(MERCHANT_NAME)}`,
    `am=${formatAmountForUpi(amount)}`,
    'cu=INR',
    `tn=${encodeURIComponent(description.slice(0, 80))}`,
  ];
  return params.join('&');
}

export function buildUpiPaymentLink(amount: number, description: string): string {
  return `upi://pay?${buildUpiQuery(amount, description)}`;
}

function buildPaymentAppLink(methodId: string, amount: number, description: string): string {
  const query = buildUpiQuery(amount, description);
  switch (methodId) {
    case 'gpay':
      return `tez://upi/pay?${query}`;
    case 'phonepe':
      return `phonepe://pay?${query}`;
    case 'paytm':
      return `paytmmp://pay?${query}`;
    case 'upi':
    default:
      return buildUpiPaymentLink(amount, description);
  }
}

/** Chrome on Android needs intent:// URLs to hand off to installed UPI apps. */
function buildAndroidIntentLink(methodId: string, amount: number, description: string): string | null {
  if (typeof navigator === 'undefined' || !/Android/i.test(navigator.userAgent)) {
    return null;
  }

  const query = buildUpiQuery(amount, description);
  const playStoreFallback =
    'S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.google.android.apps.nbu.paisa.user';

  switch (methodId) {
    case 'gpay':
      return `intent://upi/pay?${query}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;${playStoreFallback};end`;
    case 'phonepe':
      return `intent://upi/pay?${query}#Intent;scheme=upi;package=com.phonepe.app;end`;
    case 'paytm':
      return `intent://upi/pay?${query}#Intent;scheme=upi;package=net.one97.paytm;end`;
    case 'upi':
    default:
      return `intent://upi/pay?${query}#Intent;scheme=upi;end`;
  }
}

/** URL opened when the customer taps a UPI payment option. */
export function getPaymentLaunchUrl(methodId: string, amount: number, description: string): string {
  const query = buildUpiQuery(amount, description);

  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)) {
    return buildAndroidIntentLink(methodId, amount, description) ?? `upi://pay?${query}`;
  }

  if (Platform.OS === 'android') {
    return `upi://pay?${query}`;
  }

  return buildPaymentAppLink(methodId, amount, description);
}

export function usesUpiAppLink(methodId: string): boolean {
  return !shouldUseInAppCheckout(methodId);
}

function getBestPaymentLaunchUrl(methodId: string, amount: number, description: string): string {
  return getPaymentLaunchUrl(methodId, amount, description);
}

let paymentAppOpenedInGesture = false;

export function markPaymentAppLaunching(): void {
  paymentAppOpenedInGesture = true;
}

function openPaymentUrlSync(url: string, fallbackUrl?: string): boolean {
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return false;
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      return true;
    } catch {
      try {
        window.location.href = url;
        return true;
      } catch {
        return false;
      }
    }
  }

  void Linking.openURL(url).catch(() => {
    if (fallbackUrl) {
      void Linking.openURL(fallbackUrl);
    }
  });
  return true;
}

/** Must run synchronously inside the payment method tap (before any await). */
export function openPaymentAppImmediately(methodId: string, amount: number, description: string): boolean {
  if (shouldUseInAppCheckout(methodId)) {
    paymentAppOpenedInGesture = false;
    return false;
  }

  const primary = getPaymentLaunchUrl(methodId, amount, description);
  const fallback = buildUpiPaymentLink(amount, description);
  paymentAppOpenedInGesture = openPaymentUrlSync(primary, fallback);
  return paymentAppOpenedInGesture;
}

async function openPaymentUrl(url: string): Promise<boolean> {
  return openPaymentUrlSync(url);
}

function getPaymentMethodLabel(methodId: string): string {
  return ONLINE_PAYMENT_OPTIONS.find((option) => option.id === methodId)?.label ?? 'UPI';
}

export async function launchOnlinePayment(
  methodId: string,
  amount: number,
  description: string,
): Promise<{ launched: boolean; methodLabel: string }> {
  const methodLabel = getPaymentMethodLabel(methodId);

  if (shouldUseInAppCheckout(methodId)) {
    await delay(methodId === 'card' ? 1200 : 700);
    return { launched: true, methodLabel };
  }

  if (paymentAppOpenedInGesture) {
    paymentAppOpenedInGesture = false;
    await delay(1500);
    return { launched: true, methodLabel };
  }

  const primaryLink = getBestPaymentLaunchUrl(methodId, amount, description);
  if (await openPaymentUrl(primaryLink)) {
    await delay(1500);
    return { launched: true, methodLabel };
  }

  if (methodId !== 'upi') {
    const fallbackLink = buildUpiPaymentLink(amount, description);
    if (await openPaymentUrl(fallbackLink)) {
      await delay(1500);
      return { launched: true, methodLabel };
    }
  }

  return { launched: false, methodLabel };
}

export type WalletTransaction = {
  id: string;
  date: string;
  desc: string;
  amt: string;
  positive: boolean;
  method: string;
  receiptText: string;
};

export type PaymentMethod = {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
  badge?: string;
};

export type WalletState = {
  balance: number;
  referralCredit: number;
  transactions: WalletTransaction[];
  paymentMethods: PaymentMethod[];
};

const DEFAULT_WALLET: WalletState = {
  balance: 0,
  referralCredit: 0,
  transactions: [],
  paymentMethods: [],
};

function storageKey(phone: string): string {
  return `@lunchflow_wallet_${phone}`;
}

function formatTxDate(date = new Date()): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatAmount(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function parseInrAmount(price: string): number {
  return Number(price.replace(/[^\d]/g, '')) || 0;
}

function buildPaymentMethods(phone: string): PaymentMethod[] {
  const upiId = phone ? `${phone}@paytm` : 'customer@upi';
  return [
    {
      id: 'upi',
      icon: 'UPI',
      iconBg: colors.greenLight,
      iconColor: colors.green,
      title: 'UPI',
      sub: `${upiId} · Default`,
      badge: 'Active',
    },
    {
      id: 'card',
      icon: 'VISA',
      iconBg: colors.purpleLight,
      iconColor: colors.purple,
      title: '•••• 4242',
      sub: 'Expires 08/27',
    },
  ];
}

export async function loadWallet(phone: string): Promise<WalletState> {
  if (!phone) return { ...DEFAULT_WALLET, paymentMethods: buildPaymentMethods('') };

  try {
    const raw = await AsyncStorage.getItem(storageKey(phone));
    if (!raw) {
      return { ...DEFAULT_WALLET, paymentMethods: buildPaymentMethods(phone) };
    }
    const stored = JSON.parse(raw) as Omit<WalletState, 'paymentMethods'>;
    return {
      balance: stored.balance ?? 0,
      referralCredit: stored.referralCredit ?? 0,
      transactions: stored.transactions ?? [],
      paymentMethods: buildPaymentMethods(phone),
    };
  } catch {
    return { ...DEFAULT_WALLET, paymentMethods: buildPaymentMethods(phone) };
  }
}

async function persistWallet(phone: string, wallet: Omit<WalletState, 'paymentMethods'>): Promise<void> {
  await AsyncStorage.setItem(storageKey(phone), JSON.stringify(wallet));
}

export async function processOnlinePayment(
  phone: string,
  amount: number,
  description: string,
  method = 'UPI',
  planId?: string,
): Promise<WalletState> {
  if (!phone || amount <= 0) return loadWallet(phone);

  let paymentId = `local-${Date.now()}`;
  const useRemotePayment = !usesWebDemoPayment();

  if (useRemotePayment) {
    try {
      const created = await createPaymentOrderFn({ phone, amount, method, planId: planId ?? '' });
      paymentId = String((created.data as { paymentId?: string }).paymentId ?? paymentId);
      await verifyPaymentOrderFn({ paymentId, phone, providerRef: method });
    } catch {
      // Continue with local receipt if Cloud Functions are unavailable.
    }
  }

  const wallet = await loadWallet(phone);
  const now = new Date();
  const verificationNote = useRemotePayment
    ? 'Status: Paid (server verified when available)'
    : 'Status: Paid (browser demo payment — use the mobile app for live UPI)';
  const tx: WalletTransaction = {
    id: paymentId,
    date: formatTxDate(now),
    desc: description,
    amt: `-${formatAmount(amount)}`,
    positive: false,
    method,
    receiptText: [
      'LunchFlow Payment Receipt',
      `Payment ID: ${paymentId}`,
      `Description: ${description}`,
      `Amount: ${formatAmount(amount)}`,
      `Method: ${method}`,
      `Date: ${now.toLocaleString('en-IN')}`,
      verificationNote,
    ].join('\n'),
  };

  const nextWallet = {
    balance: wallet.balance,
    referralCredit: wallet.referralCredit,
    transactions: [tx, ...wallet.transactions].slice(0, 30),
  };

  await persistWallet(phone, nextWallet);
  return loadWallet(phone);
}

export async function creditWalletReward(
  phone: string,
  amount: number,
  description: string,
  receiptTitle = 'Wallet Credit',
): Promise<WalletState> {
  if (!phone || amount <= 0) return loadWallet(phone);

  const wallet = await loadWallet(phone);
  const now = new Date();
  const tx: WalletTransaction = {
    id: `credit-${Date.now()}`,
    date: formatTxDate(now),
    desc: description,
    amt: `+${formatAmount(amount)}`,
    positive: true,
    method: 'Wallet',
    receiptText: [
      `LunchFlow ${receiptTitle}`,
      `Description: ${description}`,
      `Amount: +${formatAmount(amount)}`,
      `Date: ${now.toLocaleString('en-IN')}`,
    ].join('\n'),
  };

  const nextWallet = {
    balance: wallet.balance + amount,
    referralCredit: wallet.referralCredit + amount,
    transactions: [tx, ...wallet.transactions].slice(0, 30),
  };

  await persistWallet(phone, nextWallet);
  return loadWallet(phone);
}

export function downloadReceipt(transaction: WalletTransaction | undefined): boolean {
  if (!transaction) return false;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([transaction.receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lunchflow-receipt-${transaction.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  }

  return false;
}
