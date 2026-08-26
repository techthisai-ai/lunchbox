import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  LEGACY_CATEGORY_PLAN_IDS,
  registerRuntimeSubscriptionPlans,
  SUBSCRIPTION_DETAIL_PLANS,
  SUBSCRIPTION_PLANS,
  SubscriptionPlan,
} from '../constants/subscriptions';
import { db } from '../lib/firebase';
import { formatPlanPrice } from '../utils/subscription';

export type PricingPlan = {
  id: string;
  name: string;
  amount: number;
  durationDays: number;
  active: boolean;
  planType?: string;
};

const CACHE_KEY = '@lunchflow_pricing_plans';

function planTypeLabel(planId: string): string {
  if (planId === 'single-order') return 'Single order';
  if (planId === 'monthly-standard') return 'Monthly';
  if (planId.startsWith('addon-')) return 'Monthly add-on';
  return 'Category plan';
}

export function defaultPricingPlans(): PricingPlan[] {
  return SUBSCRIPTION_PLANS.map((plan) => ({
    id: plan.id,
    name: plan.detailTitle ?? plan.name,
    amount: plan.baseAmount,
    durationDays: plan.billingMonths > 0 ? plan.billingMonths * 30 : 1,
    active: true,
    planType: planTypeLabel(plan.id),
  }));
}

export function defaultAdminPricingPlans(): PricingPlan[] {
  return SUBSCRIPTION_DETAIL_PLANS.map((plan) => ({
    id: plan.id,
    name: plan.detailTitle ?? plan.name,
    amount: plan.baseAmount,
    durationDays: plan.billingMonths > 0 ? plan.billingMonths * 30 : 1,
    active: true,
    planType: planTypeLabel(plan.id),
  }));
}

function isAllowedAdminPricingPlan(plan: PricingPlan): boolean {
  if (SUBSCRIPTION_DETAIL_PLANS.some((detailPlan) => detailPlan.id === plan.id)) return true;
  if (LEGACY_CATEGORY_PLAN_IDS.has(plan.id)) return false;
  if (plan.planType === 'Category plan') return false;
  return plan.active;
}

export function filterAdminPricingPlans(plans: PricingPlan[]): PricingPlan[] {
  return plans.filter(isAllowedAdminPricingPlan);
}

export async function loadPricingPlans(): Promise<PricingPlan[]> {
  try {
    const snap = await getDoc(doc(db, 'pricing', 'subscriptions'));
    if (snap.exists()) {
      const data = snap.data() as { plans?: PricingPlan[] };
      if (data.plans?.length) {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data.plans));
        return data.plans.filter((p) => p.active);
      }
    }
  } catch {
    // Ignore.
  }

  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) return (JSON.parse(cached) as PricingPlan[]).filter((p) => p.active);
  } catch {
    // Ignore.
  }

  return defaultPricingPlans();
}

export async function savePricingPlans(plans: PricingPlan[]): Promise<void> {
  await setDoc(doc(db, 'pricing', 'subscriptions'), { plans, updatedAt: new Date().toISOString() }, { merge: true });
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(plans));
}

export async function resolvePlanAmount(
  planId: string,
  options?: { peopleCount?: number; phone?: string },
): Promise<number> {
  const plans = await loadPricingPlans();
  const base =
    plans.find((p) => p.id === planId)?.amount ?? SUBSCRIPTION_PLANS.find((p) => p.id === planId)?.baseAmount ?? 0;

  if (planId !== 'single-order') return base;

  if (options?.phone && options.peopleCount) {
    const { calculateSingleOrderPayment } = await import('./subscriptionService');
    const quote = await calculateSingleOrderPayment(options.phone, options.peopleCount);
    return quote.amountDue;
  }

  if (options?.peopleCount && options.peopleCount > 0) {
    return base * options.peopleCount;
  }

  return base;
}

export function buildSubscriptionDetailLineLabel(plan: SubscriptionPlan, amount: number): string {
  if (plan.detailLineLabel) {
    const dashIndex = plan.detailLineLabel.lastIndexOf(' - ');
    if (dashIndex >= 0) return `${plan.detailLineLabel.slice(0, dashIndex)} - ${amount}`;
  }
  return `${plan.detailTitle ?? plan.name} - ${amount}`;
}

export function applyPricingToPlan(plan: SubscriptionPlan, amount: number): SubscriptionPlan {
  const normalizedAmount = Number.isFinite(amount) && amount > 0 ? amount : plan.baseAmount;
  return {
    ...plan,
    baseAmount: normalizedAmount,
    price: formatPlanPrice(normalizedAmount),
    detailLineLabel: buildSubscriptionDetailLineLabel(plan, normalizedAmount),
  };
}

export async function loadSubscriptionDetailPlans(): Promise<SubscriptionPlan[]> {
  const pricing = await loadPricingPlans();
  const amountById = new Map(pricing.map((entry) => [entry.id, entry.amount]));
  const defaultIds = new Set(SUBSCRIPTION_DETAIL_PLANS.map((plan) => plan.id));

  const detailPlans = SUBSCRIPTION_DETAIL_PLANS.map((plan) =>
    applyPricingToPlan(plan, amountById.get(plan.id) ?? plan.baseAmount),
  );

  const customPlans = pricing
    .filter((entry) => !defaultIds.has(entry.id) && !LEGACY_CATEGORY_PLAN_IDS.has(entry.id))
    .map((entry) => pricingPlanToSubscriptionPlan(entry));

  const allPlans = [...detailPlans, ...customPlans];
  registerRuntimeSubscriptionPlans(allPlans);
  return allPlans;
}

function resolvePricingPlanKind(entry: PricingPlan): SubscriptionPlan['planKind'] {
  const type = (entry.planType ?? '').toLowerCase();
  const name = (entry.name ?? '').toLowerCase();
  const isAddon =
    type.includes('add-on') ||
    type.includes('addon') ||
    name.includes('add-on') ||
    name.includes('adding a student') ||
    name.includes('adding student');
  if (isAddon) {
    if (name.includes('different') || name.includes('diff drop') || type.includes('different')) {
      return 'addon_diff_drop';
    }
    return 'addon_same_drop';
  }
  if (type.includes('single') || (entry.durationDays <= 1 && !type.includes('monthly'))) return 'single';
  if (type.includes('monthly') || entry.durationDays >= 28) return 'monthly';
  return 'legacy';
}

export function pricingPlanToSubscriptionPlan(entry: PricingPlan): SubscriptionPlan {
  const planKind = resolvePricingPlanKind(entry);
  const billingMonths = planKind === 'monthly' ? Math.max(1, Math.round(entry.durationDays / 30)) : 0;
  const isOneDayAddon = planKind === 'addon_same_drop' || planKind === 'addon_diff_drop';
  const base: SubscriptionPlan = {
    id: entry.id,
    name: entry.name,
    detailTitle: entry.name,
    price: formatPlanPrice(entry.amount),
    period: planKind === 'single' || isOneDayAddon ? '1 day' : `${entry.durationDays} days`,
    desc: isOneDayAddon
      ? 'Valid for today only. Requires an active monthly plan.'
      : entry.planType ?? '',
    category: 'student',
    badgeLabel: entry.planType ?? 'Plan',
    billingPeriod: planKind === 'single' || isOneDayAddon ? 'per_delivery' : billingMonths >= 3 ? '3_month' : '1_month',
    billingMonths,
    baseAmount: entry.amount,
    planKind,
    expiresOnDelivery: planKind === 'single' || isOneDayAddon,
    requiresMonthlyPlan: isOneDayAddon,
    detailIcon: 'pricetag-outline',
  };

  return {
    ...base,
    detailLineLabel: buildSubscriptionDetailLineLabel(base, entry.amount),
  };
}
