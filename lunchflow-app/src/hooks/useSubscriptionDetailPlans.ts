import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { SUBSCRIPTION_DETAIL_PLANS, SubscriptionPlan } from '../constants/subscriptions';
import { loadSubscriptionDetailPlans } from '../services/slotPricingService';

export function useSubscriptionDetailPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(SUBSCRIPTION_DETAIL_PLANS);

  const refresh = useCallback(async () => {
    const loaded = await loadSubscriptionDetailPlans();
    setPlans(loaded);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { plans, refresh };
}
