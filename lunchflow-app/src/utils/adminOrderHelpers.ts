import { DeliveryDriver, DeliveryOrder, DeliveryStatus, getDropAddress } from '../types/delivery';
import { getInitials, normalizePhone } from '../constants/auth';
import { DEFAULT_SUBSCRIPTION_PLAN_ID, getSubscriptionPlan } from '../constants/subscriptions';
import { getPlanBaseAmount } from '../utils/subscription';

export const DEFAULT_ORDER_AMOUNT = getPlanBaseAmount(getSubscriptionPlan(DEFAULT_SUBSCRIPTION_PLAN_ID));

export function resolveAssignedDriver(
  order: DeliveryOrder,
  drivers: Array<{ id: string; name: string; phone: string; vehicle?: string }>,
): DeliveryDriver | null {
  if (order.driver?.name?.trim()) {
    return order.driver;
  }

  const byId = order.driver?.id ? drivers.find((driver) => driver.id === order.driver?.id) : undefined;
  const assignedPhone = normalizePhone(order.assignedDriverPhone ?? order.driver?.phone ?? '');
  const byPhone = assignedPhone.length === 10
    ? drivers.find((driver) => normalizePhone(driver.phone) === assignedPhone)
    : undefined;
  const match = byId ?? byPhone;
  if (!match) return order.driver ?? null;

  return {
    id: match.id,
    name: match.name,
    vehicle: order.driver?.vehicle ?? match.vehicle ?? '',
    rating: order.driver?.rating ?? '5.0',
    initials: order.driver?.initials || getInitials(match.name),
    etaMinutes: order.driver?.etaMinutes ?? null,
    phone: match.phone,
  };
}

export function getOrderAmountForCustomer(order: DeliveryOrder, amountsByPhone: Map<string, number>): number {
  if (typeof order.amountPaid === 'number' && order.amountPaid > 0) return order.amountPaid;
  const phone = normalizePhone(order.customerPhone);
  const fromSubscription = amountsByPhone.get(phone);
  return fromSubscription && fromSubscription > 0 ? fromSubscription : 0;
}

export function getOrderDeliveryLocation(
  order: DeliveryOrder,
  fallbackByPhone?: Map<string, string>,
): string {
  const fromOrder = getDropAddress(order).trim();
  if (fromOrder) return fromOrder;
  const fallback = fallbackByPhone?.get(normalizePhone(order.customerPhone))?.trim();
  return fallback || '';
}

export type OrderTab = 'all' | 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';

export type PaymentFilter = 'all' | 'razorpay' | 'cod' | 'paid' | 'pending_cod' | 'refunded';

export type PaymentMethodBadge = { label: string; tone: 'blue' | 'orange' | 'gray' };
export type PaymentStatusBadge = { label: string; tone: 'green' | 'yellow' | 'red' | 'gray' };

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

function resolveStructuredPaymentMethod(order: DeliveryOrder): 'RAZORPAY' | 'COD' | null {
  if (order.payment_method === 'RAZORPAY' || order.payment_method === 'COD') {
    return order.payment_method;
  }
  const legacy = (order.paymentMethod ?? '').toLowerCase();
  if (legacy.includes('by cash') || legacy.includes('cod') || legacy.includes('cash on delivery') || legacy.includes('cash')) {
    return 'COD';
  }
  if (legacy.includes('razorpay') || legacy.includes('upi') || legacy.includes('card')) {
    return 'RAZORPAY';
  }
  return null;
}

function resolveStructuredPaymentStatus(order: DeliveryOrder): 'PAID' | 'PENDING_COD' | 'COLLECTED_COD' | 'FAILED' | null {
  if (order.payment_status) return order.payment_status;
  if (order.status === 'pickup_closed') return 'FAILED';
  const method = resolveStructuredPaymentMethod(order);
  if (method === 'COD') {
    return typeof order.amountPaid === 'number' && order.amountPaid > 0 ? 'COLLECTED_COD' : 'PENDING_COD';
  }
  if (typeof order.amountPaid === 'number' && order.amountPaid > 0) return 'PAID';
  return 'PAID';
}

export function getPaymentMethodBadge(order: DeliveryOrder): PaymentMethodBadge {
  const method = resolveStructuredPaymentMethod(order);
  if (method === 'COD') return { label: 'By Cash', tone: 'orange' };
  if (method === 'RAZORPAY') return { label: 'Online (Razorpay)', tone: 'blue' };
  const legacy = (order.paymentMethod ?? '').trim();
  if (legacy) return { label: legacy, tone: 'gray' };
  return { label: 'Online (Razorpay)', tone: 'blue' };
}

export function getPaymentStatusBadge(order: DeliveryOrder): PaymentStatusBadge {
  if (order.status === 'pickup_closed') return { label: 'Failed', tone: 'red' };
  const status = resolveStructuredPaymentStatus(order);
  if (status === 'PENDING_COD') return { label: 'Pending By Cash', tone: 'yellow' };
  if (status === 'COLLECTED_COD') return { label: 'Paid', tone: 'green' };
  if (status === 'FAILED') return { label: 'Failed', tone: 'red' };
  return { label: 'Paid', tone: 'green' };
}

/** @deprecated Use getPaymentMethodBadge / getPaymentStatusBadge */
export function getPaymentInfo(order: DeliveryOrder): { label: string; tone: 'green' | 'orange' | 'blue' | 'red' } {
  const method = getPaymentMethodBadge(order);
  return { label: method.label, tone: method.tone === 'gray' ? 'blue' : method.tone };
}

export function matchesPaymentFilter(order: DeliveryOrder, filter: PaymentFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'refunded') return order.status === 'pickup_closed';
  if (filter === 'razorpay') return resolveStructuredPaymentMethod(order) === 'RAZORPAY';
  if (filter === 'cod') return resolveStructuredPaymentMethod(order) === 'COD';
  if (filter === 'paid') return getPaymentStatusBadge(order).label === 'Paid';
  if (filter === 'pending_cod') return resolveStructuredPaymentStatus(order) === 'PENDING_COD';
  return true;
}

export function isPendingByCashOrder(order: DeliveryOrder): boolean {
  if (order.payment_status === 'PENDING_COD') return true;
  if (order.payment_status === 'COLLECTED_COD' || order.payment_status === 'PAID') return false;
  if (resolveStructuredPaymentMethod(order) !== 'COD') return false;
  return !(typeof order.amountPaid === 'number' && order.amountPaid > 0);
}

export function getOrderPaymentAmount(order: DeliveryOrder, amountsByPhone: Map<string, number>): number {
  if (order.payment_status === 'PENDING_COD') {
    return order.amount_due ?? getOrderAmountForCustomer(order, amountsByPhone);
  }
  return getOrderAmountForCustomer(order, amountsByPhone);
}

export function computePaymentRevenueSummary(orders: DeliveryOrder[], amountsByPhone: Map<string, number>) {
  let razorpayRevenue = 0;
  let codCollected = 0;
  let pendingCod = 0;

  for (const order of orders) {
    const amount = getOrderPaymentAmount(order, amountsByPhone);
    if (amount <= 0) continue;
    const method = resolveStructuredPaymentMethod(order);
    const status = resolveStructuredPaymentStatus(order);
    if (method === 'RAZORPAY' && status === 'PAID') razorpayRevenue += amount;
    if (method === 'COD' && status === 'COLLECTED_COD') codCollected += amount;
    if (method === 'COD' && status === 'PENDING_COD') pendingCod += order.amount_due ?? amount;
  }

  return { razorpayRevenue, codCollected, pendingCod };
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
