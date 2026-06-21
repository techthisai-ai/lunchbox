import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_OFFERS } from '../constants/business';
import { CouponOffer } from '../types/offers';
import { loadDocument, syncDocument } from './firestoreSync';

const OFFERS_KEY = '@lunchflow_offers';
const REDEMPTIONS_KEY = '@lunchflow_coupon_redemptions';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function listActiveOffers(): Promise<CouponOffer[]> {
  try {
    const raw = await AsyncStorage.getItem(OFFERS_KEY);
    if (raw) return JSON.parse(raw) as CouponOffer[];
  } catch {
    // fall through
  }
  await AsyncStorage.setItem(OFFERS_KEY, JSON.stringify(DEFAULT_OFFERS));
  return DEFAULT_OFFERS;
}

export function calculateDiscount(baseAmount: number, offer: CouponOffer): number {
  if (offer.type === 'percentage') return Math.round((baseAmount * offer.value) / 100);
  return Math.min(baseAmount, offer.value);
}

export async function validateCoupon(
  code: string,
  billingMonths: number,
  baseAmount: number,
): Promise<{ valid: boolean; offer?: CouponOffer; discount: number; message: string }> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { valid: false, discount: 0, message: 'Enter a coupon code' };

  const offers = await listActiveOffers();
  const offer = offers.find((o) => o.code.toUpperCase() === normalized);
  if (!offer) return { valid: false, discount: 0, message: 'Invalid coupon code' };
  if (!offer.active) return { valid: false, discount: 0, message: 'This offer is inactive' };
  if (todayIso() < offer.validFrom || todayIso() > offer.validUntil) {
    return { valid: false, discount: 0, message: 'This offer has expired' };
  }
  if (billingMonths < offer.minBillingMonths) {
    return {
      valid: false,
      discount: 0,
      message: `Coupon requires at least ${offer.minBillingMonths}-month plan`,
    };
  }

  const discount = calculateDiscount(baseAmount, offer);
  return { valid: true, offer, discount, message: `${offer.title} applied` };
}

export async function redeemCoupon(phone: string, offer: CouponOffer): Promise<void> {
  const offers = await listActiveOffers();
  const next = offers.map((o) =>
    o.id === offer.id ? { ...o, redemptionCount: o.redemptionCount + 1 } : o,
  );
  await AsyncStorage.setItem(OFFERS_KEY, JSON.stringify(next));
  await syncDocument('coupons', offer.id, next.find((o) => o.id === offer.id)!);

  const raw = await AsyncStorage.getItem(REDEMPTIONS_KEY);
  const redemptions = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
  const list = redemptions[phone] ?? [];
  redemptions[phone] = [...list, offer.code];
  await AsyncStorage.setItem(REDEMPTIONS_KEY, JSON.stringify(redemptions));
  await syncDocument('coupon_redemptions', phone, { codes: redemptions[phone] });
}

export function getAutoCouponForPlan(planId: string, billingMonths: number): string | null {
  if (billingMonths < 3) return null;
  if (planId.includes('student') || planId.includes('college') || planId.includes('office')) {
    return 'SCHOOL3';
  }
  if (planId.includes('premium')) return 'PREMIUM3';
  if (planId.includes('school')) return 'SCHOOL3';
  return null;
}
