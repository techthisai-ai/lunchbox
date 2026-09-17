import { Alert, Platform } from 'react-native';

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';
export const RAZORPAY_TEST_KEY = 'rzp_test_dummyKey12345';

export type RazorpayCheckoutResult = {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};

type RazorpayHandlerResponse = RazorpayCheckoutResult;

type RazorpayInstance = {
  open: () => void;
  on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export function getRazorpayKeyId(): string {
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_RAZORPAY_KEY_ID) {
    return process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID;
  }
  return RAZORPAY_TEST_KEY;
}

export function isRazorpayDummyMode(): boolean {
  const key = getRazorpayKeyId();
  return key.includes('dummy') || key === RAZORPAY_TEST_KEY;
}

let scriptPromise: Promise<void> | null = null;

export function loadRazorpayScript(): Promise<void> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return Promise.resolve();
  }
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Could not load Razorpay checkout.')));
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay checkout.'));
    document.body.appendChild(script);
  });

  return scriptPromise;
}

function simulateDummyPayment(amountInr: number): Promise<RazorpayCheckoutResult> {
  const paymentId = `pay_test_${Date.now()}`;

  return new Promise((resolve, reject) => {
    const title = 'Razorpay Test Payment';
    const message = `Simulate successful payment of ₹${amountInr.toLocaleString('en-IN')}?\n\n(Test mode — no real charge)`;

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.confirm) {
      if (window.confirm(`${title}\n\n${message}`)) {
        resolve({ razorpay_payment_id: paymentId, razorpay_order_id: `order_test_${Date.now()}` });
      } else {
        reject(new Error('Payment cancelled.'));
      }
      return;
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => reject(new Error('Payment cancelled.')) },
      {
        text: 'Simulate Success',
        onPress: () =>
          resolve({ razorpay_payment_id: paymentId, razorpay_order_id: `order_test_${Date.now()}` }),
      },
    ]);
  });
}

export async function openRazorpayCheckout(options: {
  amountInr: number;
  description: string;
  name?: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillContact?: string;
}): Promise<RazorpayCheckoutResult> {
  const amountPaise = Math.round(options.amountInr * 100);
  if (amountPaise <= 0) {
    throw new Error('Invalid payment amount.');
  }

  if (isRazorpayDummyMode()) {
    await loadRazorpayScript().catch(() => undefined);
    return simulateDummyPayment(options.amountInr);
  }

  if (Platform.OS !== 'web') {
    return simulateDummyPayment(options.amountInr);
  }

  await loadRazorpayScript();

  if (!window.Razorpay) {
    throw new Error('Razorpay checkout is unavailable.');
  }

  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay!({
      key: getRazorpayKeyId(),
      amount: amountPaise,
      currency: 'INR',
      name: options.name ?? 'LunchBox Delivery',
      description: options.description,
      prefill: {
        name: options.prefillName,
        email: options.prefillEmail,
        contact: options.prefillContact,
      },
      handler: (response: RazorpayHandlerResponse) => resolve(response),
      modal: {
        ondismiss: () => reject(new Error('Payment cancelled.')),
      },
    });

    checkout.on('payment.failed', (response) => {
      reject(new Error(response.error?.description ?? 'Payment failed.'));
    });

    checkout.open();
  });
}
