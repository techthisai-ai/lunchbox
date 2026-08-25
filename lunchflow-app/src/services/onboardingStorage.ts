import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizePhone } from '../constants/auth';

function storageKey(phone: string): string {
  return `@lunchflow_onboarding_${normalizePhone(phone)}`;
}

export async function hasCompletedCustomerOnboarding(phone: string): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(storageKey(phone));
    return value === '1';
  } catch {
    return false;
  }
}

export async function markCustomerOnboardingComplete(phone: string): Promise<void> {
  await AsyncStorage.setItem(storageKey(phone), '1');
}
