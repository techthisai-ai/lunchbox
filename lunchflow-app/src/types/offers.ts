export type OfferType = 'percentage' | 'flat';

export type CouponOffer = {
  id: string;
  code: string;
  title: string;
  description: string;
  type: OfferType;
  value: number;
  minBillingMonths: number;
  validFrom: string;
  validUntil: string;
  active: boolean;
  maxRedemptions?: number;
  redemptionCount: number;
};
