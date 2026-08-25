import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DeliveryOrder } from '../types/delivery';
import { DriverTabParamList, RootStackParamList } from './types';
import { loadDriverByPhone } from '../services/userRegistryService';
import { normalizePhone } from '../constants/auth';

type DriverRootNavigation = Pick<NativeStackNavigationProp<RootStackParamList>, 'replace'>;
type DriverTabNavigation = Pick<BottomTabNavigationProp<DriverTabParamList>, 'navigate'>;

const PICKUP_ACTIVE_STATUSES = new Set(['driver_assigned', 'at_pickup', 'pickup_verified']);

export function getPickupOrdersForTrip(orders: DeliveryOrder[]): DeliveryOrder[] {
  return orders.filter((order) => PICKUP_ACTIVE_STATUSES.has(order.status));
}

export async function openDriverRouteMap(
  navigation: DriverTabNavigation,
  options: {
    tripActive: boolean;
    startTrip: (orders: DeliveryOrder[]) => Promise<void>;
    resumeTrip?: (orders: DeliveryOrder[]) => Promise<void>;
    refreshTripRoutes?: (orders: DeliveryOrder[]) => Promise<void>;
    assignedOrders: DeliveryOrder[];
  },
): Promise<void> {
  const pickupOrders = getPickupOrdersForTrip(options.assignedOrders);
  const resume = options.resumeTrip ?? options.refreshTripRoutes ?? options.startTrip;

  if (options.assignedOrders.length > 0) {
    await resume(options.assignedOrders);
  } else if (!options.tripActive && pickupOrders.length > 0) {
    await options.startTrip(pickupOrders);
  }

  navigation.navigate('DriverRoute');
}

export function goToDriverHome(navigation: DriverRootNavigation) {
  navigation.replace('DriverTabs', { screen: 'DriverHome' });
}

export function goToDriverPendingApproval(navigation: DriverRootNavigation) {
  navigation.replace('DriverPendingApproval');
}

export async function navigateAfterDriverLogin(navigation: DriverRootNavigation, phone: string) {
  const normalized = normalizePhone(phone);
  const driver = await loadDriverByPhone(normalized);
  if (!driver) {
    goToDriverPendingApproval(navigation);
    return;
  }

  if (driver.approvalStatus === 'approved') {
    goToDriverHome(navigation);
    return;
  }

  goToDriverPendingApproval(navigation);
}
