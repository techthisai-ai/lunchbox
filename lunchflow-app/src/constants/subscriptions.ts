export type SubscriptionCategory = 'student' | 'college' | 'office';

export type SubscriptionPlanKind = 'single' | 'monthly' | 'addon_same_drop' | 'addon_diff_drop' | 'legacy';

/** Canonical subscription prices (INR). */
export const SUBSCRIPTION_PRICING = {
  singlePerDay: 29,
  monthlyPerMonth: 499,
  addonSameDropPerMonth: 149,
  addonSameDropCompareAt: 499,
  addonDiffDropPerMonth: 249,
  addonDiffDropCompareAt: 499,
} as const;

export type SubscriptionPlan = {
  id: string;
  name: string;
  price: string;
  period: string;
  desc: string;
  category: SubscriptionCategory;
  badgeLabel: string;
  billingPeriod: '1_month' | '3_month' | 'per_delivery' | 'custom';
  billingMonths: number;
  baseAmount: number;
  planKind?: SubscriptionPlanKind;
  expiresOnDelivery?: boolean;
  requiresMonthlyPlan?: boolean;
  detailTitle?: string;
  detailSubtitle?: string;
  detailLineLabel?: string;
  detailIcon?: string;
  /** e.g. "1 day only", "per month" — shown after the price on detail cards */
  detailPriceSuffix?: string;
  /** Original price shown with strikethrough before the current price */
  detailCompareAtAmount?: number;
};

export const SUBSCRIPTION_DETAIL_PLANS: SubscriptionPlan[] = [
  {
    id: 'single-order',
    name: 'Single Order',
    detailTitle: 'For single order for single person',
    detailSubtitle: 'Perfect for occasional orders.',
    detailLineLabel: 'Single order (single person) - 29',
    detailPriceSuffix: 'per day',
    detailIcon: 'person-outline',
    price: '₹29',
    period: 'Per day',
    desc: 'Expires after your delivery is completed.',
    category: 'student',
    badgeLabel: 'Single Order',
    billingPeriod: 'per_delivery',
    billingMonths: 0,
    baseAmount: SUBSCRIPTION_PRICING.singlePerDay,
    planKind: 'single',
    expiresOnDelivery: true,
  },
  {
    id: 'monthly-standard',
    name: 'Monthly Plan',
    detailTitle: 'Monthly subscription',
    detailSubtitle: 'Best for regular, hassle-free meals every day.',
    detailLineLabel: 'Monthly subscription - 499',
    detailPriceSuffix: 'per month',
    detailIcon: 'calendar-outline',
    price: '₹499',
    period: 'Per month',
    desc: 'Auto-renews every month until cancelled.',
    category: 'student',
    badgeLabel: 'Monthly',
    billingPeriod: '1_month',
    billingMonths: 1,
    baseAmount: SUBSCRIPTION_PRICING.monthlyPerMonth,
    planKind: 'monthly',
  },
  {
    id: 'addon-same-drop',
    name: 'Add-on · Same Drop',
    detailTitle: 'Adding a student or other (same drop location)',
    detailSubtitle: 'Add an extra person at the same drop location each month.',
    detailLineLabel: 'Add student/other (same drop) - 149',
    detailCompareAtAmount: SUBSCRIPTION_PRICING.addonSameDropCompareAt,
    detailPriceSuffix: 'per month',
    detailIcon: 'people-outline',
    price: '₹149',
    period: 'Per month',
    desc: 'Requires an active monthly subscription.',
    category: 'student',
    badgeLabel: 'Add-on · Same Drop',
    billingPeriod: '1_month',
    billingMonths: 1,
    baseAmount: SUBSCRIPTION_PRICING.addonSameDropPerMonth,
    planKind: 'addon_same_drop',
    requiresMonthlyPlan: true,
  },
  {
    id: 'addon-diff-drop',
    name: 'Add-on · Different Drop',
    detailTitle: 'Adding a student or other (in different drop location)',
    detailSubtitle: 'Add an extra person at a different drop location each month.',
    detailLineLabel: 'Add student/other (different drop) - 249',
    detailCompareAtAmount: SUBSCRIPTION_PRICING.addonDiffDropCompareAt,
    detailPriceSuffix: 'per month',
    detailIcon: 'location-outline',
    price: '₹249',
    period: 'Per month',
    desc: 'Requires an active monthly subscription.',
    category: 'student',
    badgeLabel: 'Add-on · Different Drop',
    billingPeriod: '1_month',
    billingMonths: 1,
    baseAmount: SUBSCRIPTION_PRICING.addonDiffDropPerMonth,
    planKind: 'addon_diff_drop',
    requiresMonthlyPlan: true,
  },
];

export const SUBSCRIPTION_SECTIONS: { category: SubscriptionCategory; title: string }[] = [
  { category: 'student', title: 'Student' },
  { category: 'college', title: 'College' },
  { category: 'office', title: 'Office' },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  ...SUBSCRIPTION_DETAIL_PLANS,
  {
    id: 'student-1m',
    name: '1 Month',
    price: '₹699',
    period: 'Monthly',
    desc: '',
    category: 'student',
    badgeLabel: 'Student · 1M',
    billingPeriod: '1_month',
    billingMonths: 1,
    baseAmount: 699,
    planKind: 'legacy',
  },
  {
    id: 'student-3m',
    name: '3 Months',
    price: '₹1,887',
    period: '3 Months',
    desc: '',
    category: 'student',
    badgeLabel: 'Student · 3M',
    billingPeriod: '3_month',
    billingMonths: 3,
    baseAmount: 1887,
  },
  {
    id: 'college-1m',
    name: '1 Month',
    price: '₹799',
    period: 'Monthly',
    desc: '',
    category: 'college',
    badgeLabel: 'College · 1M',
    billingPeriod: '1_month',
    billingMonths: 1,
    baseAmount: 799,
  },
  {
    id: 'college-3m',
    name: '3 Months',
    price: '₹2,157',
    period: '3 Months',
    desc: '',
    category: 'college',
    badgeLabel: 'College · 3M',
    billingPeriod: '3_month',
    billingMonths: 3,
    baseAmount: 2157,
  },
  {
    id: 'office-1m',
    name: '1 Month',
    price: '₹999',
    period: 'Monthly',
    desc: '',
    category: 'office',
    badgeLabel: 'Office · 1M',
    billingPeriod: '1_month',
    billingMonths: 1,
    baseAmount: 999,
  },
  {
    id: 'office-3m',
    name: '3 Months',
    price: '₹2,697',
    period: '3 Months',
    desc: '',
    category: 'office',
    badgeLabel: 'Office · 3M',
    billingPeriod: '3_month',
    billingMonths: 3,
    baseAmount: 2697,
  },
];

export const LEGACY_CATEGORY_PLAN_IDS = new Set(
  SUBSCRIPTION_PLANS.filter(
    (plan) => !SUBSCRIPTION_DETAIL_PLANS.some((detailPlan) => detailPlan.id === plan.id),
  ).map((plan) => plan.id),
);

const LEGACY_PLAN_ID_MAP: Record<string, string> = {
  'basic-school': 'student-1m',
  'premium-school': 'student-1m',
  'basic-school-3m': 'student-3m',
  'premium-school-3m': 'student-3m',
  'standard-office': 'office-1m',
  'team-office': 'office-1m',
  'standard-office-3m': 'office-3m',
  'custom-plan': 'student-3m',
};

export const DEFAULT_SUBSCRIPTION_PLAN_ID = 'student-1m';

export function resolveSubscriptionPlanId(planId: string | null | undefined): string {
  if (!planId) return DEFAULT_SUBSCRIPTION_PLAN_ID;
  return LEGACY_PLAN_ID_MAP[planId] ?? planId;
}

export function getPlansForCategory(category: SubscriptionCategory): SubscriptionPlan[] {
  return SUBSCRIPTION_PLANS.filter((plan) => plan.category === category);
}

export function getDefaultPlanIdForRegistrationType(
  registrationType?: 'school' | 'college' | 'office' | string,
): string {
  if (registrationType === 'college') return 'college-1m';
  if (registrationType === 'office') return 'office-1m';
  return 'student-1m';
}

export function getSubscriptionPlan(planId: string | null | undefined): SubscriptionPlan {
  const resolvedId = resolveSubscriptionPlanId(planId);
  const runtime = getRuntimeSubscriptionPlan(resolvedId);
  if (runtime) return runtime;
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === resolvedId) ?? SUBSCRIPTION_PLANS[0];
}

export function isAddonSubscriptionPlan(plan: SubscriptionPlan): boolean {
  return plan.planKind === 'addon_same_drop' || plan.planKind === 'addon_diff_drop' || Boolean(plan.requiresMonthlyPlan);
}

export function isSingleOrderPlan(plan: SubscriptionPlan): boolean {
  if (isAddonSubscriptionPlan(plan)) return false;
  return plan.planKind === 'single' || Boolean(plan.expiresOnDelivery);
}

export function isMonthlySubscriptionPlan(plan: SubscriptionPlan): boolean {
  if (plan.planKind === 'monthly') return true;
  if (isSingleOrderPlan(plan) || isAddonSubscriptionPlan(plan)) return false;
  return plan.billingMonths >= 1;
}

export function getSubscriptionDetailLineLabel(plan: SubscriptionPlan): string {
  if (plan.detailLineLabel) return plan.detailLineLabel;
  return `${plan.detailTitle ?? plan.name} - ${plan.baseAmount}`;
}

export function getSubscriptionDetailPlan(planId: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_DETAIL_PLANS.find((plan) => plan.id === planId);
}

const runtimePlans = new Map<string, SubscriptionPlan>();

export function registerRuntimeSubscriptionPlans(plans: SubscriptionPlan[]): void {
  runtimePlans.clear();
  plans.forEach((plan) => runtimePlans.set(plan.id, plan));
}

export function getRuntimeSubscriptionPlan(planId: string): SubscriptionPlan | undefined {
  return runtimePlans.get(planId);
}
