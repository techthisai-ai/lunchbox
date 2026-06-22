import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { normalizePhone } from '../config';

function generatePaymentId(): string {
  return `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export const createPaymentOrder = onCall({ region: 'asia-south1' }, async (request) => {
  const phone = normalizePhone(String(request.data?.phone ?? ''));
  const amount = Number(request.data?.amount ?? 0);
  const planId = String(request.data?.planId ?? '');
  const method = String(request.data?.method ?? 'UPI');

  if (phone.length !== 10) {
    throw new HttpsError('invalid-argument', 'Invalid phone number');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpsError('invalid-argument', 'Invalid payment amount');
  }

  const db = getFirestore();
  const paymentId = generatePaymentId();
  const record = {
    paymentId,
    phone,
    amount,
    planId,
    method,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
  };

  await db.collection('payments').doc(paymentId).set(record);

  const razorpayKey = process.env.RAZORPAY_KEY_ID;
  return {
    paymentId,
    amount,
    currency: 'INR',
    provider: razorpayKey ? 'razorpay' : 'demo',
    razorpayKeyId: razorpayKey ?? null,
    orderRef: paymentId,
  };
});

export const verifyPaymentOrder = onCall({ region: 'asia-south1' }, async (request) => {
  const paymentId = String(request.data?.paymentId ?? '').trim();
  const phone = normalizePhone(String(request.data?.phone ?? ''));
  const providerRef = String(request.data?.providerRef ?? '').trim();

  if (!paymentId) {
    throw new HttpsError('invalid-argument', 'Missing payment reference');
  }

  const db = getFirestore();
  const ref = db.collection('payments').doc(paymentId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Payment not found');
  }

  const payment = snap.data() as { phone?: string; amount?: number; status?: string; planId?: string };
  if (phone && payment.phone && normalizePhone(payment.phone) !== phone) {
    throw new HttpsError('permission-denied', 'Payment does not belong to this user');
  }
  if (payment.status === 'paid') {
    return { verified: true, paymentId, planId: payment.planId ?? null, amount: payment.amount ?? 0 };
  }

  // Demo / manual verification path until Razorpay webhook is configured.
  await ref.update({
    status: 'paid',
    verifiedAt: FieldValue.serverTimestamp(),
    providerRef: providerRef || 'demo-verified',
  });

  if (payment.phone && payment.planId) {
    await db.collection('users').doc(normalizePhone(payment.phone)).set(
      {
        activePlanId: payment.planId,
        subscriptionPaidAt: new Date().toISOString(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  return {
    verified: true,
    paymentId,
    planId: payment.planId ?? null,
    amount: payment.amount ?? 0,
  };
});
