import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { SUBSCRIPTION_PLANS } from '../constants/subscriptions';
import { db } from '../lib/firebase';

export type PricingPlan = {
  id: string;
  name: string;
  amount: number;
  durationDays: number;
  active: boolean;
};

const CACHE_KEY = '@lunchflow_pricing_plans';

export function defaultPricingPlans(): PricingPlan[] {
  return SUBSCRIPTION_PLANS.map((plan) => ({
    id: plan.id,
    name: plan.name,
    amount: plan.baseAmount,
    durationDays: plan.billingMonths * 30,
    active: true,
  }));
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

export async function resolvePlanAmount(planId: string): Promise<number> {
  const plans = await loadPricingPlans();
  return plans.find((p) => p.id === planId)?.amount ?? SUBSCRIPTION_PLANS.find((p) => p.id === planId)?.baseAmount ?? 0;
}
