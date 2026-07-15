import { SubscriptionPlan } from '../constants/subscriptions';
import { BillingPeriod } from '../types/subscription';

export function getPlanBillingMonths(plan: SubscriptionPlan): number {
  return plan.billingMonths ?? 1;
}

export function getPlanBillingPeriod(plan: SubscriptionPlan): BillingPeriod {
  if (plan.billingPeriod) return plan.billingPeriod;
  return plan.billingMonths === 3 ? '3_month' : '1_month';
}

export function getPlanBaseAmount(plan: SubscriptionPlan): number {
  if (plan.baseAmount != null) return plan.baseAmount;
  const parsed = Number(plan.price.replace(/[^\d]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatPlanPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
