import {
  LEGACY_CATEGORY_PLAN_IDS,
  resolveSubscriptionPlanId,
  SUBSCRIPTION_DETAIL_PLANS,
  SubscriptionPlan,
} from '../constants/subscriptions';
import { loadSubscriptionDetailPlans } from '../services/slotPricingService';

const LEGACY_DISPLAY_PLAN_ID: Record<string, string> = {
  'student-1m': 'monthly-standard',
  'student-3m': 'monthly-standard',
  'college-1m': 'monthly-standard',
  'college-3m': 'monthly-standard',
  'office-1m': 'monthly-standard',
  'office-3m': 'monthly-standard',
};

function mapPlanIdForDisplay(planId: string): string {
  const resolved = resolveSubscriptionPlanId(planId);
  return LEGACY_DISPLAY_PLAN_ID[resolved] ?? (LEGACY_CATEGORY_PLAN_IDS.has(resolved) ? 'monthly-standard' : resolved);
}

function fallbackDetailPlan(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_DETAIL_PLANS.find((plan) => plan.id === planId);
}

/** Customer-facing labels/prices only — subscription logic keeps using stored planId. */
export async function resolveSubscriptionPlanForDisplay(planId: string): Promise<SubscriptionPlan> {
  const displayId = mapPlanIdForDisplay(planId);
  const plans = await loadSubscriptionDetailPlans();
  return plans.find((plan) => plan.id === displayId) ?? fallbackDetailPlan(displayId) ?? plans[0] ?? SUBSCRIPTION_DETAIL_PLANS[0];
}

export function getSubscriptionDisplayName(plan: SubscriptionPlan): string {
  return plan.detailTitle ?? plan.name;
}

export function getSubscriptionDisplayDuration(record: { billingPeriod?: string; months?: number; expiresOnDelivery?: boolean }, plan: SubscriptionPlan): string {
  if (plan.planKind === 'single' || plan.expiresOnDelivery || record.expiresOnDelivery) return '1 Delivery';
  if (record.billingPeriod === '3_month' || (record.months ?? 0) >= 3) return '3 Months';
  if (plan.planKind === 'monthly' || plan.billingMonths >= 1) return '1 Month';
  return plan.period;
}
