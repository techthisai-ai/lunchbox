import { RootStackParamList } from './types';
import { hasActiveSubscription } from '../services/subscriptionService';
import { normalizePhone } from '../constants/auth';

type CustomerRootNavigation = {
  reset: (state: {
    index: number;
    routes: { name: keyof RootStackParamList; params?: object }[];
  }) => void;
};

export function goToCustomerHome(navigation: CustomerRootNavigation) {
  navigation.reset({
    index: 0,
    routes: [{ name: 'MainTabs', params: { screen: 'Home', params: { screen: 'HomeMain' } } }],
  });
}

export function goToSubscriptionOnboarding(navigation: CustomerRootNavigation) {
  navigation.reset({
    index: 0,
    routes: [{ name: 'SubscriptionOnboarding' }],
  });
}

/** After login: go to customer home. */
export async function navigateAfterCustomerLogin(navigation: CustomerRootNavigation, _phone: string) {
  goToCustomerHome(navigation);
}

/** After registration: subscription unless an active plan already exists. */
export async function navigateAfterCustomerRegistration(navigation: CustomerRootNavigation, phone: string) {
  const normalized = normalizePhone(phone);
  const subscribed = await hasActiveSubscription(normalized);
  if (subscribed) {
    goToCustomerHome(navigation);
    return;
  }
  goToSubscriptionOnboarding(navigation);
}
