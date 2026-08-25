import { ProfileStackParamList, RootStackParamList } from './types';
import { prefetchOnboardingPageAds } from '../services/promoAdService';

type CustomerRootNavigation = {
  reset: (state: {
    index: number;
    routes: { name: keyof RootStackParamList; params?: object }[];
  }) => void;
};

type ProfileTabNavigation = {
  navigate: (
    name: 'Profile',
    params: { screen: keyof ProfileStackParamList; initial?: boolean } | { state: { index: number; routes: { name: keyof ProfileStackParamList }[] } },
  ) => void;
};

type ProfileStackNavigation = {
  canGoBack: () => boolean;
  goBack: () => void;
  navigate: (name: 'ProfileMain') => void;
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

export function goToCustomerOnboarding(navigation: CustomerRootNavigation) {
  navigation.reset({
    index: 0,
    routes: [{ name: 'CustomerOnboarding' }],
  });
}

/** After login: registered customers go straight to home. */
export async function navigateAfterCustomerLogin(navigation: CustomerRootNavigation, _phone: string) {
  goToCustomerHome(navigation);
}

/** After registration: new customers see Get Started / Next intro first. */
export async function navigateAfterCustomerRegistration(navigation: CustomerRootNavigation, _phone: string) {
  await prefetchOnboardingPageAds();
  goToCustomerOnboarding(navigation);
}

/** Open a Profile sub-screen on top of Profile, so Back returns to Profile — not Home. */
export function openCustomerProfileScreen(
  navigation: ProfileTabNavigation,
  screen: keyof ProfileStackParamList,
) {
  navigation.navigate('Profile', { screen, initial: false });
}

/** Tab press: always show the root Profile page. */
export function resetCustomerProfileTab(navigation: ProfileTabNavigation) {
  navigation.navigate('Profile', {
    state: { index: 0, routes: [{ name: 'ProfileMain' }] },
  });
}

export function goBackInProfileStack(navigation: ProfileStackNavigation) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.navigate('ProfileMain');
}
