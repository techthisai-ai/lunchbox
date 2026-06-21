import { DeliveryOrder, DeliveryStatus } from '../types/delivery';
import { normalizePhone } from '../constants/auth';
import { DEFAULT_SUBSCRIPTION_PLAN_ID, getSubscriptionPlan } from '../constants/subscriptions';
import { getPlanBaseAmount } from '../utils/subscription';

export const DEFAULT_ORDER_AMOUNT = getPlanBaseAmount(getSubscriptionPlan(DEFAULT_SUBSCRIPTION_PLAN_ID));

export function getOrderAmountForCustomer(order: DeliveryOrder, amountsByPhone: Map<string, number>): number {
  const phone = normalizePhone(order.customerPhone);
  return amountsByPhone.get(phone) ?? DEFAULT_ORDER_AMOUNT;
}

export type OrderTab = 'all' | 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';

export type PaymentFilter = 'all' | 'paid' | 'cash' | 'upi' | 'refunded';

export function formatOrderDisplayId(id: string): string {
  const compact = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const suffix = compact.slice(-8).padStart(8, '0');
  return `LF-${suffix.slice(0, 4)}-${suffix.slice(4)}`;
}

export function formatOrderDateTime(order: DeliveryOrder): { date: string; time: string } {
  const raw = order.bookedAt ?? order.foodReadyAt ?? order.date;
  if (!raw) {
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return { date: today, time: '—' };
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { date: raw, time: '—' };
  }
  return {
    date: parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    time: parsed.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  };
}

export function getOrderTab(status: DeliveryStatus): OrderTab {
  if (status === 'pickup_closed') return 'cancelled';
  if (status === 'delivered') return 'delivered';
  if (status === 'in_transit' || status === 'at_drop') return 'in_transit';
  if (status === 'picked_up' || status === 'pickup_verified') return 'picked_up';
  if (
    status === 'booked' ||
    status === 'food_ready' ||
    status === 'awaiting_driver' ||
    status === 'driver_assigned' ||
    status === 'at_pickup'
  ) {
    return 'pending';
  }
  return 'pending';
}

export function getTableStatusLabel(status: DeliveryStatus): string {
  const tab = getOrderTab(status);
  if (tab === 'cancelled') return 'Cancelled';
  if (tab === 'delivered') return 'Delivered';
  if (tab === 'in_transit') return 'In Transit';
  if (tab === 'picked_up') return 'Picked Up';
  if (status === 'booked') return 'Booked';
  return 'Pending';
}

export function getTableStatusTone(status: DeliveryStatus): 'blue' | 'green' | 'orange' | 'gray' | 'yellow' | 'red' {
  const tab = getOrderTab(status);
  if (tab === 'cancelled') return 'red';
  if (tab === 'delivered') return 'green';
  if (tab === 'in_transit') return 'yellow';
  if (tab === 'picked_up') return 'blue';
  if (status === 'booked') return 'blue';
  return 'orange';
}

export function getPaymentInfo(order: DeliveryOrder): { label: string; tone: 'green' | 'orange' | 'blue' | 'red' } {
  if (order.status === 'pickup_closed') return { label: 'Refunded', tone: 'red' };
  if (order.status === 'delivered') return { label: 'Paid', tone: 'green' };
  const digit = Number(order.customerPhone?.slice(-1) ?? 0);
  if (digit % 3 === 0) return { label: 'Cash', tone: 'orange' };
  if (digit % 3 === 1) return { label: 'UPI', tone: 'blue' };
  return { label: 'Paid', tone: 'green' };
}

export function matchesPaymentFilter(order: DeliveryOrder, filter: PaymentFilter): boolean {
  if (filter === 'all') return true;
  const payment = getPaymentInfo(order);
  if (filter === 'paid') return payment.label === 'Paid';
  if (filter === 'cash') return payment.label === 'Cash';
  if (filter === 'upi') return payment.label === 'UPI';
  if (filter === 'refunded') return payment.label === 'Refunded';
  return true;
}

export function countByTab(orders: DeliveryOrder[]): Record<OrderTab, number> {
  const counts: Record<OrderTab, number> = {
    all: orders.length,
    pending: 0,
    picked_up: 0,
    in_transit: 0,
    delivered: 0,
    cancelled: 0,
  };
  for (const order of orders) {
    const tab = getOrderTab(order.status);
    counts[tab] += 1;
  }
  return counts;
}

export function filterOrders(
  orders: DeliveryOrder[],
  opts: {
    tab: OrderTab;
    query: string;
    statusFilter: 'all' | DeliveryStatus;
    paymentFilter: PaymentFilter;
    driverFilter: string;
  },
): DeliveryOrder[] {
  const q = opts.query.trim().toLowerCase();
  return orders.filter((order) => {
    if (opts.tab !== 'all' && getOrderTab(order.status) !== opts.tab) return false;
    if (opts.statusFilter !== 'all' && order.status !== opts.statusFilter) return false;
    if (!matchesPaymentFilter(order, opts.paymentFilter)) return false;
    if (opts.driverFilter !== 'all' && order.driver?.id !== opts.driverFilter) return false;
    if (!q) return true;
    const haystack = [
      order.id,
      formatOrderDisplayId(order.id),
      order.customerName,
      order.customerPhone,
      order.pickupAddress,
      order.school,
      order.dropAddress,
      order.driver?.name,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
