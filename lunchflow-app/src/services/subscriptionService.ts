import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  DEFAULT_SUBSCRIPTION_PLAN_ID,
  getSubscriptionPlan,
  SubscriptionPlan,
} from '../constants/subscriptions';
import { normalizePhone } from '../constants/auth';
import { CustomerSubscription, SubscriptionHistoryEntry } from '../types/subscription';
import { getPlanBaseAmount, getPlanBillingMonths, getPlanBillingPeriod } from '../utils/subscription';
import { db } from '../lib/firebase';
import { loadDocument, syncDocument } from './firestoreSync';
import { pushNotification } from './notificationService';

function activeKey(phone: string): string {
  return `@lunchflow_subscription_${normalizePhone(phone)}`;
}

function historyKey(phone: string): string {
  return `@lunchflow_subscription_history_${normalizePhone(phone)}`;
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
): CustomerSubscription {
  const now = new Date();
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
      .filter((record) => record.status === 'active' && today <= record.endDate)
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
    const latest = historyDoc?.entries?.find((entry) => entry.status === 'active' && today <= entry.endDate);
    if (!latest) return null;

    const record: CustomerSubscription = {
      id: latest.id,
      customerPhone: normalized,
      planId: latest.planId,
      billingPeriod: latest.billingPeriod,
      months: latest.billingPeriod === '3_month' ? 3 : 1,
      status: 'active',
      startDate: latest.startDate,
      endDate: latest.endDate,
      renewalDate: latest.endDate,
      amountPaid: latest.amountPaid,
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
  return isoDate(new Date()) <= record.endDate;
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
    if (record && record.status === 'active' && isoDate(new Date()) > record.endDate) {
      const expired: CustomerSubscription = { ...record, status: 'expired', updatedAt: new Date().toISOString() };
      await AsyncStorage.setItem(activeKey(normalized), JSON.stringify(expired));
    }
    return false;
  }

  return true;
}

export async function resolveCustomerSubscriptionAmount(phone: string): Promise<number> {
  const normalized = normalizePhone(phone);
  const fallback = getPlanBaseAmount(getSubscriptionPlan(DEFAULT_SUBSCRIPTION_PLAN_ID));
  if (normalized.length !== 10) return fallback;

  let record = await loadActiveSubscriptionRecord(normalized);
  if (!record) {
    record = await hydrateActiveSubscriptionFromRemote(normalized);
  }

  if (record) {
    if (record.amountPaid > 0) return record.amountPaid;
    return getPlanBaseAmount(getSubscriptionPlan(record.planId));
  }

  return fallback;
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

export async function saveActiveSubscription(
  phone: string,
  planId: string,
  amountPaid?: number,
  couponCode?: string,
  discountAmount?: number,
): Promise<SubscriptionPlan> {
  const normalized = normalizePhone(phone);
  const plan = getSubscriptionPlan(planId);
  const paid = amountPaid ?? getPlanBaseAmount(plan);
  const record = buildSubscriptionRecord(normalized, plan, paid, couponCode, discountAmount);

  await AsyncStorage.setItem(activeKey(normalized), JSON.stringify(record));
  await appendHistory(normalized, record);
  await syncDocument('subscriptions', record.id, record);

  return plan;
}

export async function checkSubscriptionRenewalReminders(phone: string): Promise<void> {
  const record = await loadActiveSubscriptionRecord(phone);
  if (!record || record.status !== 'active') return;

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
  if (record.status === 'active') return 'Active';
  return record.status;
}
