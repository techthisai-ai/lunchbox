import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { normalizePhone } from '../config';
import { sendLoginOtpSms } from '../services/sms';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function customerUid(phone: string): string {
  return `customer_${phone}`;
}

function driverUid(phone: string): string {
  return `driver_${phone}`;
}

type LoginRole = 'customer' | 'driver';

export const requestLoginOtp = onCall({ region: 'asia-south1' }, async (request) => {
  const rawPhone = String(request.data?.phone ?? '');
  const role = (String(request.data?.role ?? 'customer') as LoginRole) || 'customer';
  const phone = normalizePhone(rawPhone);

  if (phone.length !== 10) {
    throw new HttpsError('invalid-argument', 'Enter a valid 10-digit mobile number');
  }

  const db = getFirestore();
  if (role === 'driver') {
    const drivers = await db.collection('drivers').where('phone', '==', phone).limit(1).get();
    if (drivers.empty) {
      throw new HttpsError('not-found', 'Driver not registered. Please sign up first.');
    }
  } else {
    const userSnap = await db.collection('users').doc(phone).get();
    if (!userSnap.exists) {
      throw new HttpsError('not-found', 'Mobile number not registered. Please sign up first.');
    }
  }

  const otp = generateOtp();
  await db.collection('otpSessions').doc(`${role}_${phone}`).set({
    otp,
    phone,
    role,
    attempts: 0,
    expiresAt: Date.now() + OTP_TTL_MS,
    createdAt: FieldValue.serverTimestamp(),
  });

  const smsResult = await sendLoginOtpSms(phone, otp);
  if (!smsResult.ok && smsResult.provider !== 'console') {
    throw new HttpsError('internal', smsResult.error ?? 'Failed to send OTP SMS');
  }

  return {
    success: true,
    provider: smsResult.provider,
    expiresInSeconds: OTP_TTL_MS / 1000,
    devOtp: smsResult.provider === 'console' ? otp : undefined,
  };
});

export const verifyLoginOtp = onCall({ region: 'asia-south1' }, async (request) => {
  const rawPhone = String(request.data?.phone ?? '');
  const code = String(request.data?.otp ?? '').trim();
  const role = (String(request.data?.role ?? 'customer') as LoginRole) || 'customer';
  const phone = normalizePhone(rawPhone);

  if (phone.length !== 10) {
    throw new HttpsError('invalid-argument', 'Enter a valid 10-digit mobile number');
  }
  if (!/^\d{4,6}$/.test(code)) {
    throw new HttpsError('invalid-argument', 'Enter a valid OTP');
  }

  const db = getFirestore();
  const sessionRef = db.collection('otpSessions').doc(`${role}_${phone}`);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    throw new HttpsError('not-found', 'OTP session expired. Request a new OTP.');
  }

  const session = sessionSnap.data() as { otp: string; expiresAt: number; attempts: number; role?: LoginRole };
  if (Date.now() > session.expiresAt) {
    await sessionRef.delete();
    throw new HttpsError('deadline-exceeded', 'OTP expired. Request a new OTP.');
  }
  if (session.attempts >= MAX_ATTEMPTS) {
    throw new HttpsError('resource-exhausted', 'Too many attempts. Request a new OTP.');
  }

  if (session.otp !== code) {
    await sessionRef.update({ attempts: FieldValue.increment(1) });
    throw new HttpsError('permission-denied', 'Invalid OTP. Please try again.');
  }

  await sessionRef.delete();

  const auth = getAuth();

  if (role === 'driver') {
    const drivers = await db.collection('drivers').where('phone', '==', phone).limit(1).get();
    if (drivers.empty) {
      throw new HttpsError('not-found', 'Driver profile not found.');
    }
    const driverDoc = drivers.docs[0];
    const profile = driverDoc.data() as { name?: string; vehicle?: string };
    const uid = driverUid(phone);
    try {
      await auth.getUser(uid);
    } catch {
      await auth.createUser({ uid, phoneNumber: `+91${phone}`, displayName: profile.name ?? 'Driver' });
    }

    await db.collection('profiles').doc(uid).set(
      {
        role: 'driver',
        phone,
        name: profile.name ?? 'Driver',
        vehicle: profile.vehicle ?? '',
        driverId: driverDoc.id,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const customToken = await auth.createCustomToken(uid, { role: 'driver', phone, driverId: driverDoc.id });
    return {
      customToken,
      user: {
        id: driverDoc.id,
        role: 'driver',
        name: profile.name ?? 'Driver',
        phone,
        vehicle: profile.vehicle ?? '',
      },
    };
  }

  const userSnap = await db.collection('users').doc(phone).get();
  if (!userSnap.exists) {
    throw new HttpsError('not-found', 'Customer profile not found.');
  }
  const profile = userSnap.data() as { name?: string };

  const uid = customerUid(phone);
  try {
    await auth.getUser(uid);
  } catch {
    await auth.createUser({ uid, phoneNumber: `+91${phone}`, displayName: profile.name ?? 'Customer' });
  }

  await db.collection('profiles').doc(uid).set(
    {
      role: 'customer',
      phone,
      name: profile.name ?? 'Customer',
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const customToken = await auth.createCustomToken(uid, { role: 'customer', phone });

  return {
    customToken,
    user: {
      id: uid,
      role: 'customer',
      name: profile.name ?? 'Customer',
      phone,
    },
  };
});
