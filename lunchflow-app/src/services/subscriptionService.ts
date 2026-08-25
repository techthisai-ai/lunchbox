import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  DEFAULT_SUBSCRIPTION_PLAN_ID,
  getSubscriptionPlan,
  isAddonSubscriptionPlan,
  isMonthlySubscriptionPlan,
  isSingleOrderPlan,
  SubscriptionPlan,
} from '../constants/subscriptions';
import { normalizePhone } from '../constants/auth';
import { CustomerSubscription, SubscriptionHistoryEntry } from '../types/subscription';
import { getPlanBaseAmount, getPlanBillingMonths, getPlanBillingPeriod } from '../utils/subscription';
import { db } from '../lib/firebase';
import { loadDocument, syncDocument } from './firestoreSync';
import { pushNotification } from './notificationService';

export type SubscriptionAddonStatus = 'active' | 'used' | 'expired';

export type SubscriptionAddonEntry = {
  id: string;
  planId: string;
  amountPaid: number;
  createdAt: string;
  /** Calendar day this one-day add-on is valid for (YYYY-MM-DD). */
  validDate: string;
  status: SubscriptionAddonStatus;
  usedAt?: string;
};

function activeKey(phone: string): string {
  return `@lunchflow_subscription_${normalizePhone(phone)}`;
}

function historyKey(phone: string): string {
  return `@lunchflow_subscription_history_${normalizePhone(phone)}`;
}

function addonKey(phone: string): string {
  return `@lunchflow_subscription_addons_${normalizePhone(phone)}`;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildSubscriptionRecord(
  phone: string,
  plan: SubscriptionPlan,
  amountPaid: number,
  couponCode?: string,
  discountAmount?: number,
  paymentMethod?: string,
): CustomerSubscription {
  const now = new Date();

  if (isSingleOrderPlan(plan)) {
    const today = isoDate(now);
    return {
      id: `SUB-${Date.now()}`,
      customerPhone: phone,
      planId: plan.id,
      billingPeriod: 'per_delivery',
      months: 0,
      status: 'active',
      startDate: today,
      endDate: today,
      renewalDate: today,
      amountPaid,
      paymentMethod,
      couponCode,
      discountAmount,
      expiresOnDelivery: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  const months = getPlanBillingMonths(plan);
  const end = addMonths(now, months);
  const renewal = new Date(end);
  renewal.setDate(renewal.getDate() - 7);

  return {
    id: `SUB-${Date.now()}`,
    customerPhone: phone,
    planId: plan.id,
    billingPeriod: getPlanBillingPeriod(plan),
    months,
    status: 'active',
    startDate: isoDate(now),
    endDate: isoDate(end),
    renewalDate: isoDate(renewal),
    amountPaid,
    paymentMethod,
    couponCode,
    discountAmount,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function loadActiveSubscriptionRecord(phone: string): Promise<CustomerSubscription | null> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return null;
  try {
    const raw = await AsyncStorage.getItem(activeKey(normalized));
    return raw ? (JSON.parse(raw) as CustomerSubscription) : null;
  } catch {
    return null;
  }
}

async function hydrateActiveSubscriptionFromRemote(phone: string): Promise<CustomerSubscription | null> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return null;

  const today = isoDate(new Date());

  try {
    const snap = await getDocs(query(collection(db, 'subscriptions'), where('customerPhone', '==', normalized)));
    const remote = snap.docs
      .map((docSnap) => docSnap.data() as CustomerSubscription)
      .filter((record) => record.status === 'active')
      .filter((record) => record.expiresOnDelivery || today <= record.endDate)
      .sort((a, b) => b.endDate.localeCompare(a.endDate))[0];

    if (remote) {
      await AsyncStorage.setItem(activeKey(normalized), JSON.stringify(remote));
      return remote;
    }
  } catch {
    // Fall back to local history below.
  }

  try {
    const historyDoc = await loadDocument<{ entries?: SubscriptionHistoryEntry[] }>('subscription_history', normalized);
    const latest = historyDoc?.entries?.find(
      (entry) => entry.status === 'active' && (entry.billingPeriod === 'per_delivery' || today <= entry.endDate),
    );
    if (!latest) return null;

    const record: CustomerSubscription = {
      id: latest.id,
      customerPhone: normalized,
      planId: latest.planId,
      billingPeriod: latest.billingPeriod,
      months: latest.billingPeriod === '3_month' ? 3 : latest.billingPeriod === 'per_delivery' ? 0 : 1,
      status: 'active',
      startDate: latest.startDate,
      endDate: latest.endDate,
      renewalDate: latest.endDate,
      amountPaid: latest.amountPaid,
      expiresOnDelivery: latest.billingPeriod === 'per_delivery',
      createdAt: latest.createdAt,
      updatedAt: latest.createdAt,
    };
    await AsyncStorage.setItem(activeKey(normalized), JSON.stringify(record));
    return record;
  } catch {
    return null;
  }
}

function isSubscriptionCurrentlyActive(record: CustomerSubscription | null): boolean {
  if (!record || record.status !== 'active') return false;
  if (record.expiresOnDelivery || getSubscriptionPlan(record.planId).expiresOnDelivery) return true;
  return isoDate(new Date()) <= record.endDate;
}

export function isSubscriptionRecordActive(record: CustomerSubscription | null): boolean {
  return isSubscriptionCurrentlyActive(record);
}

export function getSubscriptionRemainingDays(record: CustomerSubscription): number {
  const plan = getSubscriptionPlan(record.planId);
  if (isSingleOrderPlan(plan) || record.expiresOnDelivery) return 1;
  const end = new Date(`${record.endDate}T23:59:59`);
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000));
}

export function getSubscriptionDurationLabel(plan: SubscriptionPlan): string {
  if (isSingleOrderPlan(plan)) return '1 Delivery';
  if (plan.billingMonths === 3) return '3 Months';
  if (isMonthlySubscriptionPlan(plan)) return '1 Month';
  return plan.period;
}

export function getSubscriptionEndLabel(plan: SubscriptionPlan, record: CustomerSubscription): string {
  if (isSingleOrderPlan(plan) || record.expiresOnDelivery) return 'After delivery completes';
  const date = new Date(`${record.endDate}T12:00:00`);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function loadActiveSubscription(phone: string): Promise<SubscriptionPlan> {
  const record = await loadActiveSubscriptionRecord(phone);
  if (!record) return getSubscriptionPlan(DEFAULT_SUBSCRIPTION_PLAN_ID);
  return getSubscriptionPlan(record.planId);
}

export async function hasActiveSubscription(phone: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return false;

  let record = await loadActiveSubscriptionRecord(normalized);
  if (!isSubscriptionCurrentlyActive(record)) {
    record = await hydrateActiveSubscriptionFromRemote(normalized);
  }

  if (!isSubscriptionCurrentlyActive(record)) {
    if (record && record.status === 'active' && !record.expiresOnDelivery && isoDate(new Date()) > record.endDate) {
      const expired: CustomerSubscription = { ...record, status: 'expired', updatedAt: new Date().toISOString() };
      await AsyncStorage.setItem(activeKey(normalized), JSON.stringify(expired));
    }
    return false;
  }

  return true;
}

export async function hasActiveMonthlySubscription(phone: string): Promise<boolean> {
  if (!(await hasActiveSubscription(phone))) return false;
  const record = await loadActiveSubscriptionRecord(phone);
  if (!record) return false;
  return isMonthlySubscriptionPlan(getSubscriptionPlan(record.planId));
}

export async function resolveCustomerSubscriptionAmount(phone: string): Promise<number> {
  const snapshot = await loadSubscriptionPaymentSnapshot(phone);
  return snapshot?.amountPaid ?? 0;
}

export async function loadSubscriptionPaymentSnapshot(
  phone: string,
): Promise<{ amountPaid: number; paymentMethod?: string; planId?: string } | null> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return null;

  let record = await loadActiveSubscriptionRecord(normalized);
  if (!record) {
    record = await hydrateActiveSubscriptionFromRemote(normalized);
  }
  if (!record) return null;

  const addons = await loadSubscriptionAddons(normalized);
  const today = isoDate(new Date());
  const addonPaid = addons
    .filter((entry) => entry.validDate === today)
    .reduce((sum, entry) => sum + (entry.amountPaid || 0), 0);

  const amountPaid = (record.amountPaid > 0 ? record.amountPaid : getPlanBaseAmount(getSubscriptionPlan(record.planId))) + addonPaid;
  return {
    amountPaid,
    paymentMethod: record.paymentMethod,
    planId: record.planId,
  };
}

export async function loadSubscriptionAmountsByPhone(phones: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(phones.map((phone) => normalizePhone(phone)).filter((p) => p.length === 10))];
  const entries = await Promise.all(
    unique.map(async (phone) => [phone, await resolveCustomerSubscriptionAmount(phone)] as const),
  );
  return new Map(entries);
}

export async function loadSubscriptionHistory(phone: string): Promise<SubscriptionHistoryEntry[]> {
  if (!phone) return [];
  try {
    const raw = await AsyncStorage.getItem(historyKey(phone));
    return raw ? (JSON.parse(raw) as SubscriptionHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function normalizeAddonEntry(entry: SubscriptionAddonEntry): SubscriptionAddonEntry {
  const createdDay = entry.createdAt?.slice(0, 10) || isoDate(new Date());
  const validDate = entry.validDate || createdDay;
  const today = isoDate(new Date());
  let status: SubscriptionAddonStatus = entry.status ?? 'active';
  if (status === 'active' && validDate < today) {
    status = 'expired';
  }
  return { ...entry, validDate, status };
}

export async function loadSubscriptionAddons(phone: string): Promise<SubscriptionAddonEntry[]> {
  if (!phone) return [];
  try {
    const raw = await AsyncStorage.getItem(addonKey(phone));
    const parsed = raw ? (JSON.parse(raw) as SubscriptionAddonEntry[]) : [];
    const normalized = parsed.map(normalizeAddonEntry);
    const changed = normalized.some((entry, index) => entry.status !== parsed[index]?.status || !parsed[index]?.validDate);
    if (changed) {
      await AsyncStorage.setItem(addonKey(phone), JSON.stringify(normalized.slice(0, 50)));
    }
    return normalized;
  } catch {
    return [];
  }
}

/** Unused one-day add-ons that are valid for today only. */
export async function loadActiveTodayAddons(phone: string): Promise<SubscriptionAddonEntry[]> {
  const today = isoDate(new Date());
  const addons = await loadSubscriptionAddons(phone);
  return addons.filter((entry) => entry.status === 'active' && entry.validDate === today);
}

async function countTodayAddonSeats(phone: string): Promise<{ sameDropSeats: number; diffDropSeats: number }> {
  const todayAddons = await loadActiveTodayAddons(phone);
  return {
    sameDropSeats: todayAddons.filter(
      (entry) => getSubscriptionPlan(entry.planId).planKind === 'addon_same_drop',
    ).length,
    diffDropSeats: todayAddons.filter(
      (entry) => getSubscriptionPlan(entry.planId).planKind === 'addon_diff_drop',
    ).length,
  };
}

/** Mark today's unused add-on seats as used when food ready includes extra people. */
export async function consumeTodayAddonsForDelivery(
  phone: string,
  students: Array<{ dropLocation: string }>,
): Promise<void> {
  if (students.length <= 1) return;

  const normalized = normalizePhone(phone);
  const keys = students.map((entry) => normalizeDropLocationKey(entry.dropLocation)).filter(Boolean);
  if (keys.length <= 1) {
    // Still consume generic seats when extras exist but drops are blank.
    const sameNeeded = Math.max(0, students.length - 1);
    await markTodayAddonsUsed(normalized, sameNeeded, 0);
    return;
  }

  const primary = keys[0];
  const sameNeeded = keys.slice(1).filter((key) => key === primary).length;
  const diffNeeded = keys.slice(1).filter((key) => key !== primary).length;
  await markTodayAddonsUsed(normalized, sameNeeded, diffNeeded);
}

async function markTodayAddonsUsed(phone: string, sameNeeded: number, diffNeeded: number): Promise<void> {
  if (sameNeeded <= 0 && diffNeeded <= 0) return;

  const all = await loadSubscriptionAddons(phone);
  const today = isoDate(new Date());
  let sameLeft = sameNeeded;
  let diffLeft = diffNeeded;
  const now = new Date().toISOString();

  const next = all.map((entry) => {
    if (entry.status !== 'active' || entry.validDate !== today) return entry;
    const kind = getSubscriptionPlan(entry.planId).planKind;
    if (kind === 'addon_same_drop' && sameLeft > 0) {
      sameLeft -= 1;
      return { ...entry, status: 'used' as const, usedAt: now };
    }
    if (kind === 'addon_diff_drop' && diffLeft > 0) {
      diffLeft -= 1;
      return { ...entry, status: 'used' as const, usedAt: now };
    }
    return entry;
  });

  await AsyncStorage.setItem(addonKey(phone), JSON.stringify(next.slice(0, 50)));
}

async function appendHistory(phone: string, record: CustomerSubscription): Promise<void> {
  const history = await loadSubscriptionHistory(phone);
  const entry: SubscriptionHistoryEntry = {
    id: record.id,
    planId: record.planId,
    billingPeriod: record.billingPeriod,
    amountPaid: record.amountPaid,
    startDate: record.startDate,
    endDate: record.endDate,
    status: record.status,
    createdAt: record.createdAt,
  };
  await AsyncStorage.setItem(historyKey(phone), JSON.stringify([entry, ...history].slice(0, 50)));
  await syncDocument('subscription_history', phone, { entries: [entry, ...history].slice(0, 20) });
}

async function appendAddon(phone: string, planId: string, amountPaid: number): Promise<void> {
  const addons = await loadSubscriptionAddons(phone);
  const today = isoDate(new Date());
  const entry: SubscriptionAddonEntry = {
    id: `ADDON-${Date.now()}`,
    planId,
    amountPaid,
    createdAt: new Date().toISOString(),
    validDate: today,
    status: 'active',
  };
  await AsyncStorage.setItem(addonKey(phone), JSON.stringify([entry, ...addons].slice(0, 50)));
}

export async function saveActiveSubscription(
  phone: string,
  planId: string,
  amountPaid?: number,
  couponCode?: string,
  discountAmount?: number,
  paymentMethod?: string,
): Promise<SubscriptionPlan> {
  const normalized = normalizePhone(phone);
  const plan = getSubscriptionPlan(planId);
  const paid = amountPaid ?? getPlanBaseAmount(plan);

  if (isAddonSubscriptionPlan(plan)) {
    if (!(await hasActiveMonthlySubscription(normalized))) {
      throw new Error('Add-on plans require an active monthly subscription.');
    }
    await appendAddon(normalized, plan.id, paid);
    return plan;
  }

  const existing = await loadActiveSubscriptionRecord(normalized);
  if (
    existing &&
    isSubscriptionCurrentlyActive(existing) &&
    isSingleOrderPlan(plan) &&
    isMonthlySubscriptionPlan(getSubscriptionPlan(existing.planId))
  ) {
    throw new Error('You already have an active monthly subscription. Use it for daily deliveries.');
  }

  const record = buildSubscriptionRecord(normalized, plan, paid, couponCode, discountAmount, paymentMethod);

  await AsyncStorage.setItem(activeKey(normalized), JSON.stringify(record));
  await appendHistory(normalized, record);
  await syncDocument('subscriptions', record.id, record);

  return plan;
}

export async function expireSubscriptionAfterDelivery(
  phone: string,
  students?: Array<{ dropLocation: string }>,
): Promise<void> {
  const normalized = normalizePhone(phone);
  if (normalized.length !== 10) return;

  if (students && students.length > 1) {
    await consumeTodayAddonsForDelivery(normalized, students);
  }

  const record = await loadActiveSubscriptionRecord(normalized);
  if (!record || record.status !== 'active') return;

  const plan = getSubscriptionPlan(record.planId);
  if (!record.expiresOnDelivery && !isSingleOrderPlan(plan)) return;

  const expired: CustomerSubscription = {
    ...record,
    status: 'expired',
    endDate: isoDate(new Date()),
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(activeKey(normalized), JSON.stringify(expired));
  await appendHistory(normalized, expired);
  await syncDocument('subscriptions', record.id, expired);
}

export async function checkSubscriptionRenewalReminders(phone: string): Promise<void> {
  const record = await loadActiveSubscriptionRecord(phone);
  if (!record || record.status !== 'active' || record.expiresOnDelivery) return;

  const today = isoDate(new Date());
  if (today >= record.renewalDate && today <= record.endDate) {
    await pushNotification(phone, {
      icon: 'notifications',
      title: 'Subscription Renewal',
      msg: `Your ${getSubscriptionPlan(record.planId).badgeLabel} renews on ${record.endDate}.`,
    });
  }

  if (today > record.endDate) {
    const expired: CustomerSubscription = { ...record, status: 'expired', updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(activeKey(phone), JSON.stringify(expired));
    await syncDocument('subscriptions', record.id, expired);
  }
}

export function getSubscriptionStatusLabel(phone: string, record: CustomerSubscription | null): string {
  if (!record) return 'Inactive';
  if (record.status === 'expired') return 'Expired';
  if (record.status === 'active' && record.expiresOnDelivery) return 'Active until delivery';
  if (record.status === 'active') return 'Active';
  return record.status;
}

export type FoodReadyDeliveryQuota = {
  maxPeople: number;
  allowAddPeople: boolean;
  isSingleOrder: boolean;
  planLabel: string;
  sameDropSeats: number;
  diffDropSeats: number;
};

export function normalizeDropLocationKey(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * How many people / lunchboxes the customer can include when marking food ready.
 *
 * Pricing concepts (admin amounts unchanged):
 * - Single delivery in one location (₹29 single order): exactly 1 person / 1 drop
 * - Monthly (₹499): 1 person included per day
 * - More than one delivery at the same drop (₹99 1-day add-on each)
 * - Multiple deliveries at different drops (₹199 1-day add-on each)
 */
export async function getFoodReadyDeliveryQuota(phone: string): Promise<FoodReadyDeliveryQuota> {
  const normalized = normalizePhone(phone);
  let record = await loadActiveSubscriptionRecord(normalized);
  if (!isSubscriptionCurrentlyActive(record)) {
    record = await hydrateActiveSubscriptionFromRemote(normalized);
  }

  if (!isSubscriptionCurrentlyActive(record) || !record) {
    return {
      maxPeople: 1,
      allowAddPeople: false,
      isSingleOrder: true,
      planLabel: 'No active plan',
      sameDropSeats: 0,
      diffDropSeats: 0,
    };
  }

  const plan = getSubscriptionPlan(record.planId);
  if (isSingleOrderPlan(plan) || record.expiresOnDelivery) {
    return {
      maxPeople: 1,
      allowAddPeople: false,
      isSingleOrder: true,
      planLabel: plan.detailTitle ?? plan.name,
      sameDropSeats: 0,
      diffDropSeats: 0,
    };
  }

  const { sameDropSeats, diffDropSeats } = await countTodayAddonSeats(normalized);
  // Monthly includes 1 delivery; purchased same/diff 1-day add-ons add seats for today.
  const maxPeople = 1 + sameDropSeats + diffDropSeats;

  return {
    maxPeople,
    allowAddPeople: true,
    isSingleOrder: false,
    planLabel: plan.detailTitle ?? plan.name,
    sameDropSeats,
    diffDropSeats,
  };
}

export function validateFoodReadyPeopleCount(
  peopleCount: number,
  quota: FoodReadyDeliveryQuota,
): string | null {
  if (peopleCount < 1) return 'Add at least one student or employee';
  if (peopleCount > quota.maxPeople) {
    if (quota.isSingleOrder) {
      return 'Single delivery (₹29): only 1 person at 1 location. Buy Monthly + location add-ons for more.';
    }
    return `Today you can include ${quota.maxPeople} ${quota.maxPeople === 1 ? 'person' : 'people'} (monthly + today’s add-ons). Same drop ₹99 · Different drop ₹199.`;
  }
  return null;
}

/**
 * Enforce location concepts:
 * - Single order: 1 person only
 * - Monthly: 1 included; same-drop extras need ₹99 seats; different-drop extras need ₹199 seats
 */
export async function validateFoodReadyDropLocations(
  phone: string,
  students: Array<{ dropLocation: string }>,
  quota: FoodReadyDeliveryQuota,
): Promise<string | null> {
  if (quota.isSingleOrder) {
    if (students.length > 1) {
      return 'Single delivery (₹29): only 1 person at 1 location.';
    }
    return null;
  }

  if (students.length <= 1) return null;

  const { sameDropSeats, diffDropSeats } = await countTodayAddonSeats(phone);
  const keys = students.map((entry) => normalizeDropLocationKey(entry.dropLocation)).filter(Boolean);

  if (keys.length < students.length) {
    if (students.length - 1 > sameDropSeats + diffDropSeats) {
      return 'Buy a 1-day add-on for today: same location ₹99, or different location ₹199.';
    }
    return null;
  }

  const primary = keys[0];
  const sameDropExtras = keys.slice(1).filter((key) => key === primary).length;
  const differentDropPeople = keys.slice(1).filter((key) => key !== primary).length;

  if (sameDropExtras > sameDropSeats) {
    return `More than one delivery at the same location needs the ₹99 add-on (1 day each). You need ${sameDropExtras}, have ${sameDropSeats}.`;
  }
  if (differentDropPeople > diffDropSeats) {
    return `Deliveries at different locations need the ₹199 add-on (1 day each). You need ${differentDropPeople}, have ${diffDropSeats}.`;
  }
  return null;
}
