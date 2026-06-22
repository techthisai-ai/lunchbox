import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { loadDriverByPhone } from '../services/userRegistryService';
import { normalizePhone } from '../constants/auth';

type DriverRootNavigation = Pick<NativeStackNavigationProp<RootStackParamList>, 'replace'>;

export function goToDriverHome(navigation: DriverRootNavigation) {
  navigation.replace('DriverTabs', { screen: 'DriverHome' });
}

export function goToDriverPendingApproval(navigation: DriverRootNavigation) {
  navigation.replace('DriverPendingApproval');
}

export async function navigateAfterDriverLogin(navigation: DriverRootNavigation, phone: string) {
  const normalized = normalizePhone(phone);
  const driver = await loadDriverByPhone(normalized);
  const approvalStatus = driver?.approvalStatus ?? 'approved';

  if (approvalStatus === 'approved') {
    goToDriverHome(navigation);
    return;
  }

  goToDriverPendingApproval(navigation);
}
