import { DeliveryBatch } from '../types/batch';
import { DeliveryOrder, getDropAddress } from '../types/delivery';

export type DriverLocationGroup = {
  id: string;
  batchId?: string;
  locationName: string;
  address: string;
  deliveryType: string;
  orders: DeliveryOrder[];
  pendingOrders: DeliveryOrder[];
  deliveredOrders: DeliveryOrder[];
  pendingCount: number;
  deliveredCount: number;
  totalCount: number;
  isFullyDelivered: boolean;
};

export function getLocationGroupKey(order: DeliveryOrder): string {
  return `${order.deliveryType}::${getDropAddress(order).trim().toLowerCase()}`;
}

export function getOrderStudentName(order: DeliveryOrder): string {
  return order.studentName?.trim() || order.customerName?.trim() || 'Student';
}

const ACTIVE_DROP_STATUSES = new Set(['in_transit', 'at_drop', 'picked_up']);

export function isActiveDropOrder(order: DeliveryOrder): boolean {
  return ACTIVE_DROP_STATUSES.has(order.status);
}

export function buildDriverLocationGroups(
  activeOrders: DeliveryOrder[],
  batches: DeliveryBatch[] = [],
): DriverLocationGroup[] {
  const dropOrders = activeOrders.filter(isActiveDropOrder);
  const groups = new Map<string, DeliveryOrder[]>();

  for (const order of dropOrders) {
    const key = getLocationGroupKey(order);
    const list = groups.get(key) ?? [];
    list.push(order);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .map(([key, orders]) => {
      const sample = orders[0];
      const address = getDropAddress(sample);
      const batch = batches.find(
        (entry) =>
          entry.orderIds.some((orderId) => orders.some((order) => order.id === orderId)) ||
          entry.dropAddress.trim().toLowerCase() === address.trim().toLowerCase(),
      );
      const pendingOrders = orders.filter((order) => order.status !== 'delivered');
      const deliveredOrders = orders.filter((order) => order.status === 'delivered');

      return {
        id: batch?.id ?? `group-${key}`,
        batchId: batch?.id,
        locationName: sample.school?.trim() || address,
        address,
        deliveryType: sample.deliveryType,
        orders,
        pendingOrders,
        deliveredOrders,
        pendingCount: pendingOrders.length,
        deliveredCount: deliveredOrders.length,
        totalCount: orders.length,
        isFullyDelivered: pendingOrders.length === 0 && orders.length > 0,
      };
    })
    .sort((a, b) => b.pendingCount - a.pendingCount || a.locationName.localeCompare(b.locationName));
}

export function buildCompletedLocationGroups(completedOrders: DeliveryOrder[]): DriverLocationGroup[] {
  const groups = new Map<string, DeliveryOrder[]>();

  for (const order of completedOrders) {
    const key = getLocationGroupKey(order);
    const list = groups.get(key) ?? [];
    list.push(order);
    groups.set(key, list);
  }

  return [...groups.entries()]
    .map(([key, orders]) => {
      const sample = orders[0];
      const address = getDropAddress(sample);

      return {
        id: `completed-${key}`,
        locationName: sample.school?.trim() || address,
        address,
        deliveryType: sample.deliveryType,
        orders,
        pendingOrders: [],
        deliveredOrders: orders,
        pendingCount: 0,
        deliveredCount: orders.length,
        totalCount: orders.length,
        isFullyDelivered: true,
      };
    })
    .sort((a, b) => b.totalCount - a.totalCount || a.locationName.localeCompare(b.locationName));
}
