export type SubscriptionCategory = 'student' | 'college' | 'office';

export type SubscriptionPlan = {
  id: string;
  name: string;
  price: string;
  period: string;
  desc: string;
  category: SubscriptionCategory;
  badgeLabel: string;
  billingPeriod: '1_month' | '3_month';
  billingMonths: number;
  baseAmount: number;
};

export const SUBSCRIPTION_SECTIONS: { category: SubscriptionCategory; title: string }[] = [
  { category: 'student', title: 'Student' },
  { category: 'college', title: 'College' },
  { category: 'office', title: 'Office' },
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
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
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === resolvedId) ?? SUBSCRIPTION_PLANS[0];
}
