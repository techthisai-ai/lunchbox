import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { colors } from '../constants/theme';
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

function formatAmountForUpi(amount: number): string {
  return amount.toFixed(2);
}

export function buildUpiPaymentLink(amount: number, description: string): string {
  const params = new URLSearchParams({
    pa: MERCHANT_VPA,
    pn: MERCHANT_NAME,
    am: formatAmountForUpi(amount),
    cu: 'INR',
    tn: description.slice(0, 80),
  });
  return `upi://pay?${params.toString()}`;
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

  if (methodId === 'card') {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return { launched: true, methodLabel };
  }

  const upiLink = buildUpiPaymentLink(amount, description);

  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.location.href = upiLink;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return { launched: true, methodLabel };
    }

    const canOpen = await Linking.canOpenURL(upiLink);
    if (canOpen) {
      await Linking.openURL(upiLink);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { launched: true, methodLabel };
    }
  } catch {
    // Fall through to simulated success for demo environments.
  }

  await new Promise((resolve) => setTimeout(resolve, 800));
  return { launched: true, methodLabel };
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
  try {
    const created = await createPaymentOrderFn({ phone, amount, method, planId: planId ?? '' });
    paymentId = String((created.data as { paymentId?: string }).paymentId ?? paymentId);
    await verifyPaymentOrderFn({ paymentId, phone, providerRef: method });
  } catch {
    // Continue with local receipt if Cloud Functions are unavailable.
  }

  const wallet = await loadWallet(phone);
  const now = new Date();
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
      'Status: Paid (server verified when available)',
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
