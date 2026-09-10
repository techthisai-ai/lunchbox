import { DeliveryOrder, DeliveryStatus } from '../types/delivery';

/** Rank used to derive progress percent across the full delivery lifecycle. */
export function orderStatusRank(status: DeliveryStatus): number {
  switch (status) {
    case 'booked':
      return 1;
    case 'food_ready':
      return 2;
    case 'awaiting_driver':
      return 3;
    case 'driver_assigned':
      return 4;
    case 'at_pickup':
      return 5;
    case 'pickup_verified':
      return 6;
    case 'picked_up':
      return 7;
    case 'in_transit':
      return 8;
    case 'at_drop':
      return 9;
    case 'delivered':
      return 10;
    case 'pickup_closed':
      return 0;
    default:
      return 0;
  }
}

/** Maps Firestore order status to the 5-step Home progress index (0–4). */
export function getHomeProgressIndex(status: DeliveryStatus): number {
  if (status === 'delivered') return 4;
  if (status === 'in_transit' || status === 'at_drop') return 3;
  if (status === 'picked_up') return 2;
  if (
    status === 'food_ready' ||
    status === 'awaiting_driver' ||
    status === 'driver_assigned' ||
    status === 'at_pickup' ||
    status === 'pickup_verified'
  ) {
    return 1;
  }
  return 0;
}

/** Progress ring percent derived from order status (25% at booked → 100% at delivered). */
export function getHomeProgressPercent(status: DeliveryStatus): number {
  const rank = orderStatusRank(status);
  if (rank === 0) return 0;
  const min = orderStatusRank('booked');
  const max = orderStatusRank('delivered');
  return Math.round(25 + ((rank - min) / (max - min)) * 75);
}

export function getHomeGaugeMeta(order: DeliveryOrder | null): {
  percent: number;
  status: string;
  hint: string;
} {
  if (!order || order.status === 'booked') {
    return { percent: getHomeProgressPercent('booked'), status: 'READY TO BOOK', hint: 'Tap when lunchbox is packed & ready.' };
  }
  if (order.status === 'pickup_closed') {
    return { percent: 0, status: 'CANCELLED', hint: 'This delivery was cancelled.' };
  }
  if (order.status === 'delivered') {
    return { percent: 100, status: 'DELIVERED', hint: 'Enjoy your meal!' };
  }
  if (order.status === 'picked_up') {
    return { percent: getHomeProgressPercent(order.status), status: 'PICKED UP', hint: 'Your lunchbox was collected.' };
  }
  if (order.status === 'in_transit' || order.status === 'at_drop') {
    return { percent: getHomeProgressPercent(order.status), status: 'IN TRANSIT', hint: 'Your lunchbox is on the way.' };
  }
  if (order.status === 'driver_assigned' || order.status === 'at_pickup' || order.status === 'pickup_verified') {
    return { percent: getHomeProgressPercent(order.status), status: 'RIDER ASSIGNED', hint: 'Rider is heading to pickup.' };
  }
  if (order.status === 'awaiting_driver' || order.status === 'food_ready') {
    return { percent: getHomeProgressPercent(order.status), status: 'FOOD READY', hint: 'Waiting for a rider to accept.' };
  }
  return { percent: getHomeProgressPercent('booked'), status: 'READY TO BOOK', hint: 'Tap when lunchbox is packed & ready.' };
}

export const HOME_PROGRESS_STEPS: {
  label: string;
  icon: 'checkmark' | 'restaurant-outline' | 'bag-handle-outline' | 'bicycle-outline' | 'cube-outline';
  timeKey: 'bookedAt' | 'foodReadyAt' | 'pickedUpAt' | 'deliveredAt';
}[] = [
  { label: 'Booked', icon: 'checkmark', timeKey: 'bookedAt' },
  { label: 'Food Ready', icon: 'restaurant-outline', timeKey: 'foodReadyAt' },
  { label: 'Picked Up', icon: 'bag-handle-outline', timeKey: 'pickedUpAt' },
  { label: 'In Transit', icon: 'bicycle-outline', timeKey: 'pickedUpAt' },
  { label: 'Delivered', icon: 'cube-outline', timeKey: 'deliveredAt' },
];

export function getActiveStepTime(order: DeliveryOrder | null): string | null {
  if (!order) return null;

  const activeIndex = getHomeProgressIndex(order.status);
  const step = HOME_PROGRESS_STEPS[activeIndex];
  if (!step) return null;

  const raw = order[step.timeKey];
  if (!raw?.trim() && activeIndex === 0 && order.bookedAt?.trim()) {
    return formatProgressTime(order.bookedAt);
  }
  if (!raw?.trim()) return null;

  return formatProgressTime(raw);
}

function formatProgressTime(value: string | null | undefined): string {
  if (!value?.trim()) return '--';
  const trimmed = value.trim();
  if (/am|pm/i.test(trimmed)) return trimmed;
  const parsed = Date.parse(`1970-01-01 ${trimmed}`);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso)) {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return trimmed;
}
