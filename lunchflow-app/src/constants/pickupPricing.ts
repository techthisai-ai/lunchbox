/** Pickup request plan pricing (INR). */
export const PICKUP_PRICING = {
  singleDay: 29,
  monthly: 499,
  sameDropPerPerson: 99,
  diffDropPerPerson: 199,
} as const;

export type PickupPrimaryPlan = 'single' | 'monthly';

export function calculatePickupTotal(
  primaryPlan: PickupPrimaryPlan,
  sameDropCount: number,
  diffDropCount: number,
): number {
  const base = primaryPlan === 'single' ? PICKUP_PRICING.singleDay : PICKUP_PRICING.monthly;
  return (
    base +
    Math.max(0, sameDropCount) * PICKUP_PRICING.sameDropPerPerson +
    Math.max(0, diffDropCount) * PICKUP_PRICING.diffDropPerPerson
  );
}
