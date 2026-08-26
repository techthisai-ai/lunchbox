import { SubscriptionPlan, isSingleOrderPlan } from '../constants/subscriptions';

/** Human-readable payment note for UPI / receipts (supports multi-person single orders). */
export function buildSubscriptionPaymentDescription(
  plan: SubscriptionPlan,
  peopleCount: number,
  amountPaid: number,
): string {
  if (isSingleOrderPlan(plan)) {
    const count = Math.max(1, peopleCount);
    if (count <= 1) return 'Single order for 1 person';
    return `Single order for ${count} persons - Rs ${amountPaid}`;
  }
  return `${plan.detailTitle ?? plan.name} subscription`;
}
