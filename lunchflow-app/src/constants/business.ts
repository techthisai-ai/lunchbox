import { CouponOffer } from '../types/offers';

export const DEFAULT_OFFERS: CouponOffer[] = [
  {
    id: 'offer-3m-school',
    code: 'SCHOOL3',
    title: '3-Month School Saver',
    description: '10% off on 3-month school subscriptions',
    type: 'percentage',
    value: 10,
    minBillingMonths: 3,
    validFrom: '2026-01-01',
    validUntil: '2027-12-31',
    active: true,
    redemptionCount: 0,
  },
  {
    id: 'offer-3m-premium',
    code: 'PREMIUM3',
    title: 'Premium 3-Month Deal',
    description: '₹300 off on 3-month premium plans',
    type: 'flat',
    value: 300,
    minBillingMonths: 3,
    validFrom: '2026-01-01',
    validUntil: '2027-12-31',
    active: true,
    redemptionCount: 0,
  },
];

export const PICKUP_READY_TIMEOUT_MINUTES = 45;

export const CUSTOM_BILLING_MONTHS_MIN = 1;
export const CUSTOM_BILLING_MONTHS_MAX = 12;
