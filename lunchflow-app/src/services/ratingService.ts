import AsyncStorage from '@react-native-async-storage/async-storage';
import { OrderRating } from '../types/rating';
import { syncDocument } from './firestoreSync';

function storageKey(phone: string): string {
  return `@lunchflow_ratings_${phone}`;
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

export async function submitOrderRating(input: {
  orderId: string;
  customerPhone: string;
  driverId?: string;
  stars: number;
  review: string;
}): Promise<OrderRating> {
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

  return rating;
}

export async function getDriverAverageRating(driverId: string): Promise<string> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ratingKeys = keys.filter((k) => k.startsWith('@lunchflow_ratings_'));
    const allRatings: OrderRating[] = [];
    for (const key of ratingKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (raw) allRatings.push(...(JSON.parse(raw) as OrderRating[]));
    }
    const driverRatings = allRatings.filter((r) => r.driverId === driverId);
    if (driverRatings.length === 0) return '4.9';
    const avg = driverRatings.reduce((sum, r) => sum + r.stars, 0) / driverRatings.length;
    return avg.toFixed(1);
  } catch {
    return '4.9';
  }
}
