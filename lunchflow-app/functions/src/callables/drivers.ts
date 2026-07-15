import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { DocumentSnapshot, FieldValue, Firestore, getFirestore } from 'firebase-admin/firestore';
import { normalizePhone } from '../config';

type ApprovalStatus = 'pending' | 'approved' | 'rejected';

type DriverRecord = {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  licenseNumber: string;
  status: 'Available' | 'On Route' | 'Offline';
  approvalStatus: ApprovalStatus;
  registeredAt: string;
  role: 'driver';
  driverId: string;
  createdAt: string;
  updatedAt: ReturnType<typeof FieldValue.serverTimestamp> | string;
};

function assertPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) {
    throw new HttpsError('invalid-argument', 'Enter a valid 10-digit mobile number');
  }
  return normalized;
}

async function findDriverDoc(
  db: Firestore,
  driverId?: string,
  phone?: string,
): Promise<DocumentSnapshot | null> {
  if (driverId) {
    const byId = await db.collection('drivers').doc(driverId).get();
    if (byId.exists) return byId;
  }

  if (phone) {
    const byPhone = await db.collection('drivers').where('phone', '==', phone).limit(1).get();
    if (!byPhone.empty) return byPhone.docs[0];

    const userSnap = await db.collection('users').doc(phone).get();
    if (userSnap.exists && userSnap.data()?.role === 'driver') {
      const mirroredId = String(userSnap.data()?.driverId ?? userSnap.data()?.id ?? '');
      if (mirroredId) {
        const mirrored = await db.collection('drivers').doc(mirroredId).get();
        if (mirrored.exists) return mirrored;
      }
      return userSnap;
    }
  }

  return null;
}

/** Persist a newly registered driver (pending unless admin-created). Uses Admin SDK. */
export const registerPendingDriver = onCall({ region: 'asia-south1' }, async (request) => {
  const name = String(request.data?.name ?? '').trim();
  const vehicle = String(request.data?.vehicle ?? '').trim();
  const licenseNumber = String(request.data?.licenseNumber ?? '').trim();
  const phone = assertPhone(String(request.data?.phone ?? ''));
  const approvedByAdmin = Boolean(request.data?.approvedByAdmin);

  if (!name) throw new HttpsError('invalid-argument', 'Enter driver full name');
  if (!vehicle) throw new HttpsError('invalid-argument', 'Enter vehicle number');
  if (!licenseNumber) throw new HttpsError('invalid-argument', 'Enter driving license number');

  const db = getFirestore();
  const existing = await db.collection('drivers').where('phone', '==', phone).limit(1).get();
  if (!existing.empty) {
    throw new HttpsError('already-exists', 'This mobile number is already registered as a driver');
  }

  const userMirror = await db.collection('users').doc(phone).get();
  if (userMirror.exists && userMirror.data()?.role === 'driver') {
    throw new HttpsError('already-exists', 'This mobile number is already registered as a driver');
  }

  const approvalStatus: ApprovalStatus = approvedByAdmin ? 'approved' : 'pending';
  const now = new Date().toISOString();
  const id = `DRV-${phone.slice(-4)}-${Date.now().toString().slice(-4)}`;

  const record: DriverRecord = {
    id,
    name,
    phone,
    vehicle,
    licenseNumber,
    status: approvalStatus === 'approved' ? 'Available' : 'Offline',
    approvalStatus,
    registeredAt: now,
    role: 'driver',
    driverId: id,
    createdAt: now,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection('drivers').doc(id).set(record);
  await db.collection('users').doc(phone).set(record, { merge: true });

  return {
    success: true,
    driver: {
      id,
      name,
      phone,
      vehicle,
      licenseNumber,
      status: record.status,
      approvalStatus,
      registeredAt: now,
    },
  };
});

/** Approve or reject a driver from the admin portal. Uses Admin SDK. */
export const setDriverApprovalStatus = onCall({ region: 'asia-south1' }, async (request) => {
  const driverId = String(request.data?.driverId ?? '').trim();
  const phone = normalizePhone(String(request.data?.phone ?? ''));
  const approvalStatus = String(request.data?.approvalStatus ?? '') as ApprovalStatus;

  if (approvalStatus !== 'approved' && approvalStatus !== 'rejected' && approvalStatus !== 'pending') {
    throw new HttpsError('invalid-argument', 'Invalid approval status');
  }
  if (!driverId && phone.length !== 10) {
    throw new HttpsError('invalid-argument', 'Driver id or phone is required');
  }

  const db = getFirestore();
  const snap = await findDriverDoc(db, driverId || undefined, phone || undefined);
  if (!snap) {
    throw new HttpsError('not-found', 'Driver not found');
  }

  const data = snap.data() as Record<string, unknown>;
  const resolvedPhone = normalizePhone(String(data.phone ?? phone));
  const resolvedId = String(data.driverId ?? data.id ?? snap.id);
  const nextStatus = approvalStatus === 'approved' ? 'Available' : 'Offline';
  const patch = {
    approvalStatus,
    status: nextStatus,
    role: 'driver' as const,
    phone: resolvedPhone,
    driverId: resolvedId,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection('drivers').doc(resolvedId).set(patch, { merge: true });
  if (resolvedPhone.length === 10) {
    await db.collection('users').doc(resolvedPhone).set(patch, { merge: true });
  }

  return {
    success: true,
    driver: {
      id: resolvedId,
      phone: resolvedPhone,
      name: String(data.name ?? ''),
      vehicle: String(data.vehicle ?? ''),
      licenseNumber: String(data.licenseNumber ?? ''),
      approvalStatus,
      status: nextStatus,
      registeredAt: data.registeredAt ? String(data.registeredAt) : undefined,
    },
  };
});

/** List drivers waiting for admin approval. */
export const listPendingDriversFn = onCall({ region: 'asia-south1' }, async () => {
  const db = getFirestore();
  const snap = await db.collection('drivers').where('approvalStatus', '==', 'pending').get();
  const drivers = snap.docs.map((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    return {
      id: String(data.id ?? docSnap.id),
      name: String(data.name ?? ''),
      phone: normalizePhone(String(data.phone ?? '')),
      vehicle: String(data.vehicle ?? ''),
      licenseNumber: String(data.licenseNumber ?? ''),
      status: (data.status as 'Available' | 'On Route' | 'Offline') || 'Offline',
      approvalStatus: 'pending' as const,
      registeredAt: data.registeredAt ? String(data.registeredAt) : undefined,
    };
  });

  return { success: true, drivers };
});
