export type BillingPeriod = '1_month' | '3_month' | 'custom';

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
  couponCode?: string;
  discountAmount?: number;
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
