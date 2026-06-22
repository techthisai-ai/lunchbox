import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OrderRating } from '../types/rating';
import { syncDocument } from './firestoreSync';
import { updateDriverProfileFields } from './userRegistryService';

function storageKey(phone: string): string {
  return `@lunchflow_ratings_${phone}`;
}

async function loadLocalRatingsFromAllCustomers(): Promise<OrderRating[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ratingKeys = keys.filter((k) => k.startsWith('@lunchflow_ratings_'));
    const allRatings: OrderRating[] = [];
    for (const key of ratingKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) allRatings.push(...(JSON.parse(raw) as OrderRating[]));
    }
    return allRatings;
  } catch {
    return [];
  }
}

export async function loadRatingsForCustomer(phone: string): Promise<OrderRating[]> {
  if (!phone) return [];
  try {
    const raw = await AsyncStorage.getItem(storageKey(phone));
    return raw ? (JSON.parse(raw) as OrderRating[]) : [];
  } catch {
    return [];
  }
}

export async function loadRatingsForDriver(driverId: string): Promise<OrderRating[]> {
  if (!driverId) return [];

  const byOrderId = new Map<string, OrderRating>();

  for (const rating of await loadLocalRatingsFromAllCustomers()) {
    if (rating.driverId === driverId) {
      byOrderId.set(rating.orderId, rating);
    }
  }

  try {
    const snap = await getDocs(query(collection(db, 'ratings'), where('driverId', '==', driverId)));
    for (const docSnap of snap.docs) {
      const rating = docSnap.data() as OrderRating;
      byOrderId.set(rating.orderId, { ...rating, id: rating.id ?? docSnap.id });
    }
  } catch {
    // Local ratings remain available when remote read fails.
  }

  return Array.from(byOrderId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getDriverRatingSummary(
  driverId: string,
): Promise<{ average: string; reviewCount: number }> {
  const ratings = await loadRatingsForDriver(driverId);
  if (ratings.length === 0) {
    return { average: '5.0', reviewCount: 0 };
  }

  const avg = ratings.reduce((sum, rating) => sum + rating.stars, 0) / ratings.length;
  return { average: avg.toFixed(1), reviewCount: ratings.length };
}

export async function submitOrderRating(input: {
  orderId: string;
  customerPhone: string;
  driverId?: string;
  stars: number;
  review: string;
}): Promise<OrderRating> {
  if (!input.driverId) {
    throw new Error('Driver information is missing for this delivery');
  }

  const rating: OrderRating = {
    id: `RAT-${Date.now()}`,
    orderId: input.orderId,
    customerPhone: input.customerPhone,
    driverId: input.driverId,
    stars: Math.min(5, Math.max(1, input.stars)),
    review: input.review.trim(),
    createdAt: new Date().toISOString(),
  };

  const existing = await loadRatingsForCustomer(input.customerPhone);
  const withoutDuplicate = existing.filter((r) => r.orderId !== rating.orderId);
  await AsyncStorage.setItem(storageKey(input.customerPhone), JSON.stringify([rating, ...withoutDuplicate]));
  await syncDocument('ratings', rating.id, rating);

  const summary = await getDriverRatingSummary(input.driverId);
  await updateDriverProfileFields(input.driverId, {
    ratingAverage: summary.average,
    ratingCount: summary.reviewCount,
  });

  return rating;
}

export async function hasCustomerRatedOrder(customerPhone: string, orderId: string): Promise<boolean> {
  const ratings = await loadRatingsForCustomer(customerPhone);
  return ratings.some((rating) => rating.orderId === orderId);
}

/** @deprecated Use getDriverRatingSummary instead */
export async function getDriverAverageRating(driverId: string): Promise<string> {
  const summary = await getDriverRatingSummary(driverId);
  return summary.average;
}
