import { SubscriptionPlan, isAddonSubscriptionPlan, isSingleOrderPlan } from '../constants/subscriptions';

/** Human-readable payment note for UPI / receipts (supports multi-person single orders). */
export function buildSubscriptionPaymentDescription(
  plan: SubscriptionPlan,
  peopleCount: number,
  amountPaid: number,
): string {
  const count = Math.max(1, peopleCount);
  if (isSingleOrderPlan(plan)) {
    if (count <= 1) return 'Single order for 1 person';
    return `Single order for ${count} persons - ₹${amountPaid}`;
  }
  if (isAddonSubscriptionPlan(plan)) {
    const label = plan.planKind === 'addon_diff_drop' ? 'different drop' : 'same drop';
    if (count <= 1) return `Add-on (${label}) for 1 person`;
    return `Add-on (${label}) for ${count} persons - ₹${amountPaid}`;
  }
  return `${plan.detailTitle ?? plan.name} subscription`;
}
