import { DeliveryOrder, getDropAddress } from '../types/delivery';

export type DeliveryStopPhase = 'pickup_pending' | 'active' | 'pending' | 'delivered';

export type DriverDeliveryStop = {
  key: string;
  order: DeliveryOrder;
  type: 'pickup' | 'drop';
  stopNumber: number;
  title: string;
  address: string;
  timeLabel: string;
  phase: DeliveryStopPhase;
};

export function buildDriverDeliveryStops(
  pendingPickups: DeliveryOrder[],
  activeOrders: DeliveryOrder[],
): DriverDeliveryStop[] {
  const stops: DriverDeliveryStop[] = [];
  let stopNumber = 1;

  for (const order of pendingPickups) {
    stops.push({
      key: `pending-${order.id}`,
      order,
      type: 'pickup',
      stopNumber,
      title: 'Pickup Pending',
      address: order.pickupAddress,
      timeLabel: order.foodReadyAt ?? order.bookedAt ?? '—',
      phase: 'pending',
    });
    stopNumber += 1;
  }

  for (const order of activeOrders.filter((o) =>
    ['driver_assigned', 'at_pickup', 'pickup_verified'].includes(o.status),
  )) {
    stops.push({
      key: `pickup-${order.id}`,
      order,
      type: 'pickup',
      stopNumber,
      title: 'Pickup Pending',
      address: order.pickupAddress,
      timeLabel: order.foodReadyAt ?? '—',
      phase: 'pickup_pending',
    });
    stopNumber += 1;
  }

  for (const order of activeOrders.filter((o) =>
    ['in_transit', 'at_drop', 'picked_up'].includes(o.status),
  )) {
    stops.push({
      key: `drop-${order.id}`,
      order,
      type: 'drop',
      stopNumber,
      title: 'Active Delivery',
      address: getDropAddress(order),
      timeLabel: order.estimatedArrival ?? order.deliveredAt ?? '—',
      phase: 'active',
    });
    stopNumber += 1;
  }

  return stops;
}
