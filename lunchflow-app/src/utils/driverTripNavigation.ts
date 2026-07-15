import { DEMO_DROP, DEMO_PICKUP, resolveKnownLocalityPoint } from '../constants/maps';
import { EnfieldMapStop, EnfieldRouteResult } from '../services/enfieldMapsService';
import { isTrustedMapPoint, resolveMapPoint } from '../services/mapGeocoding';
import { DeliveryOrder, GeoPoint, getDropAddress } from '../types/delivery';
import { getLocationGroupKey } from './driverLocationGroups';

export type TripStopGroup = {
  id: string;
  type: 'pickup' | 'drop';
  address: string;
  locationName: string;
  point: GeoPoint;
  orders: DeliveryOrder[];
  sequence: number;
  status: 'pending' | 'completed';
  batchId?: string;
};

export type DriverTripPhase = 'idle' | 'pickup' | 'delivery' | 'completed';

export type DriverTripSnapshot = {
  phase: DriverTripPhase;
  startedAt: string | null;
  completedAt: string | null;
  pickupGroups: TripStopGroup[];
  deliveryGroups: TripStopGroup[];
  currentStopId: string | null;
  pickupRoute: EnfieldRouteResult | null;
  deliveryRoute: EnfieldRouteResult | null;
  totalDistanceKm: number;
  totalDurationMinutes: number;
};

function normalizeAddressKey(address: string): string {
  return address.trim().toLowerCase();
}

export function groupOrdersByPickupLocation(orders: DeliveryOrder[]): TripStopGroup[] {
  const groups = new Map<string, DeliveryOrder[]>();

  for (const order of orders) {
    const key = normalizeAddressKey(order.pickupAddress);
    const list = groups.get(key) ?? [];
    list.push(order);
    groups.set(key, list);
  }

  return [...groups.entries()].map(([key, groupOrders]) => {
    const sample =
      groupOrders.find(
        (order) => order.pickupLocation && isTrustedMapPoint(order.pickupLocation, order.pickupAddress),
      ) ?? groupOrders[0];
    return {
      id: `pickup-${key}`,
      type: 'pickup' as const,
      address: sample.pickupAddress,
      locationName: sample.pickupAddress,
      point:
        resolveKnownLocalityPoint(sample.pickupAddress) ??
        resolveMapPoint(sample.pickupLocation, sample.pickupAddress, DEMO_PICKUP),
      orders: groupOrders,
      sequence: 0,
      status: groupOrders.every((order) => ['picked_up', 'in_transit', 'at_drop', 'delivered'].includes(order.status))
        ? 'completed'
        : 'pending',
    };
  });
}

export function groupOrdersByDropLocation(orders: DeliveryOrder[]): TripStopGroup[] {
  const groups = new Map<string, DeliveryOrder[]>();

  for (const order of orders) {
    const key = getLocationGroupKey(order);
    const list = groups.get(key) ?? [];
    list.push(order);
    groups.set(key, list);
  }

  return [...groups.entries()].map(([key, groupOrders]) => {
    const sample =
      groupOrders.find((order) => {
        const dropAddress = getDropAddress(order);
        return order.dropLocation && isTrustedMapPoint(order.dropLocation, dropAddress);
      }) ?? groupOrders[0];
    const address = getDropAddress(sample);
    return {
      id: `drop-${key}`,
      type: 'drop' as const,
      address,
      locationName: sample.school?.trim() || address,
      point:
        resolveKnownLocalityPoint(address) ??
        resolveMapPoint(sample.dropLocation, address, DEMO_DROP),
      orders: groupOrders,
      sequence: 0,
      status: groupOrders.every((order) => order.status === 'delivered') ? 'completed' : 'pending',
      batchId: sample.batchId,
    };
  });
}

export function toEnfieldStops(groups: TripStopGroup[]): EnfieldMapStop[] {
  return groups.map((group, index) => ({
    id: group.id,
    type: group.type,
    address: group.address,
    point: group.point,
    sequence: index + 1,
    status: group.status,
  }));
}

export function applySequences(groups: TripStopGroup[], orderedStopIds: string[]): TripStopGroup[] {
  const orderMap = new Map(orderedStopIds.map((id, index) => [id, index + 1]));
  return groups
    .map((group) => ({
      ...group,
      sequence: orderMap.get(group.id) ?? group.sequence,
    }))
    .sort((a, b) => a.sequence - b.sequence || a.locationName.localeCompare(b.locationName));
}

export function getAssignedDriverOrders(active: DeliveryOrder[]): DeliveryOrder[] {
  return active;
}

export function getPickupPendingOrders(orders: DeliveryOrder[]): DeliveryOrder[] {
  return orders.filter((order) =>
    ['driver_assigned', 'at_pickup', 'pickup_verified', 'awaiting_driver', 'food_ready'].includes(order.status),
  );
}

const DELIVERY_TRIP_STATUSES = [
  'driver_assigned',
  'at_pickup',
  'pickup_verified',
  'awaiting_driver',
  'food_ready',
  'picked_up',
  'in_transit',
  'at_drop',
];

/**
 * Drop destinations for every accepted order still on the trip (not delivered/cancelled),
 * so all delivery locations are known up front and shown the moment pickups finish.
 * Orders sharing the same drop location are merged into one stop by groupOrdersByDropLocation.
 */
export function getDeliveryPendingOrders(orders: DeliveryOrder[]): DeliveryOrder[] {
  return orders.filter((order) => DELIVERY_TRIP_STATUSES.includes(order.status));
}

export function getLunchboxCount(orders: DeliveryOrder[]): number {
  return orders.reduce((total, order) => total + Math.max(1, order.studentEntries?.length ?? 1), 0);
}

export function getOrderStatusLabel(status: DeliveryOrder['status']): string {
  const labels: Record<DeliveryOrder['status'], string> = {
    booked: 'Booked',
    food_ready: 'Food Ready',
    awaiting_driver: 'Awaiting Driver',
    driver_assigned: 'Assigned',
    at_pickup: 'At Pickup',
    pickup_verified: 'Verified',
    picked_up: 'Picked Up',
    in_transit: 'In Transit',
    at_drop: 'At Drop',
    delivered: 'Delivered',
    pickup_closed: 'Cancelled',
  };
  return labels[status] ?? status;
}

export function createIdleTripSnapshot(): DriverTripSnapshot {
  return {
    phase: 'idle',
    startedAt: null,
    completedAt: null,
    pickupGroups: [],
    deliveryGroups: [],
    currentStopId: null,
    pickupRoute: null,
    deliveryRoute: null,
    totalDistanceKm: 0,
    totalDurationMinutes: 0,
  };
}
