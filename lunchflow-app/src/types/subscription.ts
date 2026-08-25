export type BillingPeriod = '1_month' | '3_month' | 'per_delivery' | 'custom';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';

export type CustomerSubscription = {
  id: string;
  customerPhone: string;
  planId: string;
  billingPeriod: BillingPeriod;
  months: number;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  renewalDate: string;
  amountPaid: number;
  paymentMethod?: string;
  couponCode?: string;
  discountAmount?: number;
  expiresOnDelivery?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionHistoryEntry = {
  id: string;
  planId: string;
  billingPeriod: BillingPeriod;
  amountPaid: number;
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  createdAt: string;
};
