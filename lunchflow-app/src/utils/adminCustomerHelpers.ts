import { normalizePhone } from '../constants/auth';
import { getSubscriptionPlan } from '../constants/subscriptions';
import { loadCustomerRegistration } from '../services/userRegistryService';
import {
  loadActiveSubscriptionRecord,
  resolveCustomerSubscriptionAmount,
} from '../services/subscriptionService';
import { DeliveryOrder, getDeliveryTypeLabel, getInstitutionLabel, getPersonLabel } from '../types/delivery';
import { getTableStatusLabel } from './adminOrderHelpers';

export type CustomerDetail = {
  order: DeliveryOrder;
  displayId: string;
  name: string;
  phone: string;
  registrationType: string;
  institutionLabel: string;
  personLabel: string;
  address: string;
  school: string;
  studentName: string;
  classSection: string;
  emergencyContact: string;
  subscriptionPlan: string;
  subscriptionAmount: number;
  subscriptionStatus: string;
  subscriptionEndDate: string;
  totalOrders: number;
  ordersToday: number;
  recentOrders: DeliveryOrder[];
};

export function formatCustomerDisplayId(phone: string): string {
  const normalized = normalizePhone(phone);
  return `CUS${normalized.slice(-3).padStart(3, '0')}`;
}

export function formatCustomerName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function countCustomerOrders(orders: DeliveryOrder[], phone: string) {
  const normalized = normalizePhone(phone);
  const customerOrders = orders.filter((order) => normalizePhone(order.customerPhone) === normalized);
  const today = new Date().toISOString().slice(0, 10);
  return {
    totalOrders: customerOrders.length,
    ordersToday: customerOrders.filter((order) => order.date === today || order.date.startsWith(today)).length,
    recentOrders: customerOrders.slice(0, 5),
  };
}

export async function buildCustomerDetail(order: DeliveryOrder, orders: DeliveryOrder[]): Promise<CustomerDetail> {
  const phone = normalizePhone(order.customerPhone);
  const registration = await loadCustomerRegistration(phone);
  const subscription = await loadActiveSubscriptionRecord(phone);
  const subscriptionAmount = await resolveCustomerSubscriptionAmount(phone);
  const counts = countCustomerOrders(orders, phone);

  const registrationType = registration?.registrationType ?? order.deliveryType;
  const plan = subscription ? getSubscriptionPlan(subscription.planId) : null;

  return {
    order,
    displayId: formatCustomerDisplayId(phone),
    name: formatCustomerName(registration?.name || order.customerName),
    phone,
    registrationType: getDeliveryTypeLabel(registrationType),
    institutionLabel: getInstitutionLabel(registrationType),
    personLabel: getPersonLabel(registrationType),
    address: registration?.address || order.pickupAddress,
    school: registration?.school || order.school,
    studentName: registration?.studentName || order.studentName,
    classSection: registration?.classSection || '—',
    emergencyContact: registration?.emergencyContact || '—',
    subscriptionPlan: plan?.badgeLabel ?? 'No active plan',
    subscriptionAmount,
    subscriptionStatus: subscription?.status === 'active' ? 'Active' : 'Inactive',
    subscriptionEndDate: subscription?.endDate ?? '—',
    totalOrders: counts.totalOrders,
    ordersToday: counts.ordersToday,
    recentOrders: counts.recentOrders,
  };
}

export async function buildCustomerDetailByPhone(phone: string, orders: DeliveryOrder[]): Promise<CustomerDetail> {
  const normalized = normalizePhone(phone);
  const customerOrders = orders.filter((order) => normalizePhone(order.customerPhone) === normalized);
  const order =
    customerOrders[0] ??
    ({
      id: `CUS-ORDER-${normalized}`,
      customerId: `CUS-${normalized}`,
      customerPhone: normalized,
      customerName: '',
      status: 'booked',
      studentName: '',
      school: '',
      deliveryType: 'school',
      pickupAddress: '',
      dropAddress: '',
      estimatedArrival: null,
      bookedAt: null,
      foodReadyAt: null,
      pickupVerifiedAt: null,
      pickedUpAt: null,
      deliveredAt: null,
      pickupOtp: '',
      qrCode: '',
      pickupLocation: null,
      dropLocation: null,
      driverLocation: null,
      driver: null,
      routePlan: null,
      date: new Date().toISOString().slice(0, 10),
    } satisfies DeliveryOrder);

  return buildCustomerDetail(order, orders);
}

export function getOrderStatusLabel(status: DeliveryOrder['status']): string {
  return getTableStatusLabel(status);
}
