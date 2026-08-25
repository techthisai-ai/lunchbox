import { DeliveryBatch } from '../types/batch';
import {
  DeliveryOrder,
  FoodReadyStudentEntry,
  getDropAddress,
  normalizeDeliveryType,
} from '../types/delivery';

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

function normalizePlaceText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,/#_'"`-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const INSTITUTION_PATTERN =
  /\b(school|college|university|office|matric|academy|vidyalaya|engineering|polytechnic|campus|convent|institute|higher secondary|hss|cbse|icse|girls|boys|it park)\b/;

function looksLikeInstitution(value: string): boolean {
  return INSTITUTION_PATTERN.test(normalizePlaceText(value));
}

function studentEntriesOf(order: DeliveryOrder): FoodReadyStudentEntry[] {
  if (order.studentEntries && order.studentEntries.length > 0) return order.studentEntries;
  if (order.students && order.students.length > 0) return order.students;
  return [];
}

function looksLikePersonPlace(order: DeliveryOrder, value: string): boolean {
  const normalized = normalizePlaceText(value).split(',')[0]?.trim() ?? '';
  if (!normalized) return false;
  if (looksLikeInstitution(normalized)) return false;
  const people = [order.studentName, order.customerName, ...studentEntriesOf(order).map((entry) => entry.name)]
    .map((name) => normalizePlaceText(name ?? ''))
    .filter(Boolean);
  return people.some((person) => normalized === person || normalized.startsWith(`${person} `) || person.startsWith(normalized));
}

function institutionCore(value: string): string {
  return normalizePlaceText(value)
    .replace(/\b(the|of|and|girls|boys|high|higher|secondary|matriculation|matric|school|college|university|office|engineering|polytechnic|campus|convent|institute|academy|vidyalaya)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getDropInstitutionName(order: DeliveryOrder): string {
  const fromEntries = studentEntriesOf(order)
    .map((entry) => entry.dropLocation.trim())
    .filter(Boolean);
  const candidates = [...fromEntries, order.school?.trim() ?? '', getDropAddress(order).split('|')[0]?.trim() ?? ''].filter(
    Boolean,
  );

  const institutional = candidates.find((value) => looksLikeInstitution(value) && !looksLikePersonPlace(order, value));
  if (institutional) return institutional;

  const notPerson = candidates.find((value) => !looksLikePersonPlace(order, value));
  return notPerson || candidates[0] || '';
}

/**
 * Same school / college / office counts as one drop, even if the typed address
 * differs by spaces, commas, or extra locality text. Student names are not used as the place.
 */
export function getLocationGroupKey(order: DeliveryOrder): string {
  const type = normalizeDeliveryType(order.deliveryType);
  const source = getDropInstitutionName(order);
  const parts = source.split(',').map((part) => normalizePlaceText(part)).filter(Boolean);
  const name = institutionCore(parts[0] || normalizePlaceText(source)) || normalizePlaceText(source);
  const locality = parts.length > 1 ? parts[parts.length - 1] : '';
  const uniqueOffice =
    name.length >= 12 ||
    /\b(technolog|pvt|ltd|limited|solutions|systems|infotech|office)\b/.test(name);

  if (uniqueOffice || !locality || locality === name || name.includes(locality)) {
    return `${type}::${name}`;
  }
  return `${type}::${locality}::${name}`;
}

export function dropsShareSamePlace(left: DeliveryOrder, right: DeliveryOrder): boolean {
  if (left.deliveryType && right.deliveryType && left.deliveryType !== right.deliveryType) {
    return false;
  }
  const leftKey = getLocationGroupKey(left);
  const rightKey = getLocationGroupKey(right);
  if (leftKey === rightKey) return true;

  const leftName = leftKey.split('::').pop() ?? '';
  const rightName = rightKey.split('::').pop() ?? '';
  if (!leftName || !rightName) return false;
  const shorter = leftName.length <= rightName.length ? leftName : rightName;
  const longer = leftName.length > rightName.length ? leftName : rightName;
  return shorter.length >= 6 && longer.includes(shorter);
}

export function getOrderStudentName(order: DeliveryOrder): string {
  return order.studentName?.trim() || order.customerName?.trim() || 'Student';
}

/** List cards: one lunchbox each. Map grouping stays on the route map. */
export function flattenLocationGroupsToOrders(groups: DriverLocationGroup[]): DriverLocationGroup[] {
  return groups.flatMap((group) =>
    group.orders.map((order) => {
      const delivered = order.status === 'delivered';
      const place = group.locationName || group.address;
      return {
        ...group,
        id: `${group.id}-${order.id}`,
        locationName: getOrderStudentName(order),
        address: place,
        orders: [order],
        pendingOrders: delivered ? [] : [order],
        deliveredOrders: delivered ? [order] : [],
        pendingCount: delivered ? 0 : 1,
        deliveredCount: delivered ? 1 : 0,
        totalCount: 1,
        isFullyDelivered: delivered,
      };
    }),
  );
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
        locationName: getDropInstitutionName(sample) || sample.school?.trim() || address,
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
        locationName: getDropInstitutionName(sample) || sample.school?.trim() || address,
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
