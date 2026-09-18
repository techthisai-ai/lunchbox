export type BillingPeriod = '1_month' | '3_month' | 'per_delivery' | 'custom';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';

export type SubscriptionPaymentMethod = 'RAZORPAY' | 'COD';

export type SubscriptionPaymentStatus = 'PAID' | 'PENDING_COD' | 'COLLECTED_COD' | 'FAILED';

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
  /** Legacy display label (e.g. "Razorpay", "By Cash"). */
  paymentMethod?: string;
  payment_method?: SubscriptionPaymentMethod;
  payment_status?: SubscriptionPaymentStatus;
  transaction_id?: string | null;
  amount_due?: number;
  cash_collected_at?: string | null;
  cash_collected_by?: string | null;
  couponCode?: string;
  discountAmount?: number;
  expiresOnDelivery?: boolean;
  /** Single-order plans: how many people were paid for (₹29 × count). */
  paidPeopleCount?: number;
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
