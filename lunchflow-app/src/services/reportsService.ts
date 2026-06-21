import { DeliveryOrder } from '../types/delivery';
import { countActiveSubscriptions, listExpenseRecords, listSalaryRecords } from './adminFinanceService';
import { listAllOrdersToday } from './orderHubService';
import { loadSubscriptionHistory, resolveCustomerSubscriptionAmount } from './subscriptionService';

export type DailySalesReport = {
  date: string;
  totalOrders: number;
  deliveredOrders: number;
  revenue: number;
};

export type MonthlyRevenueReport = {
  month: string;
  revenue: number;
  orders: number;
  subscriptions: number;
};

export type ProfitLossReport = {
  revenue: number;
  salaries: number;
  expenses: number;
  profit: number;
};

async function parseOrderRevenue(order: DeliveryOrder): Promise<number> {
  return resolveCustomerSubscriptionAmount(order.customerPhone);
}

export async function buildDailySalesReport(date = new Date().toISOString().slice(0, 10)): Promise<DailySalesReport> {
  const orders = await listAllOrdersToday();
  const dayOrders = orders.filter((o) => o.date === date);
  const delivered = dayOrders.filter((o) => o.status === 'delivered');
  const revenueParts = await Promise.all(delivered.map((order) => parseOrderRevenue(order)));
  return {
    date,
    totalOrders: dayOrders.length,
    deliveredOrders: delivered.length,
    revenue: revenueParts.reduce((sum, amount) => sum + amount, 0),
  };
}

export async function buildMonthlyRevenueReport(month = new Date().toISOString().slice(0, 7)): Promise<MonthlyRevenueReport> {
  const orders = await listAllOrdersToday();
  const monthOrders = orders.filter((o) => o.date.startsWith(month));
  const delivered = monthOrders.filter((o) => o.status === 'delivered');
  const revenueParts = await Promise.all(delivered.map((order) => parseOrderRevenue(order)));
  const activeSubs = await countActiveSubscriptions();
  return {
    month,
    revenue: revenueParts.reduce((sum, amount) => sum + amount, 0),
    orders: monthOrders.length,
    subscriptions: activeSubs,
  };
}

export async function buildSalaryReport() {
  const salaries = await listSalaryRecords();
  const paid = salaries.filter((s) => s.status === 'paid');
  const unpaid = salaries.filter((s) => s.status === 'unpaid');
  return {
    total: salaries.reduce((sum, s) => sum + s.amount, 0),
    paid: paid.reduce((sum, s) => sum + s.amount, 0),
    unpaid: unpaid.reduce((sum, s) => sum + s.amount, 0),
    records: salaries,
  };
}

export async function buildExpenseReport() {
  const expenses = await listExpenseRecords();
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});
  return {
    total: expenses.reduce((sum, e) => sum + e.amount, 0),
    byCategory,
    records: expenses,
  };
}

export async function buildProfitLossReport(): Promise<ProfitLossReport> {
  const daily = await buildDailySalesReport();
  const salary = await buildSalaryReport();
  const expense = await buildExpenseReport();
  const revenue = daily.revenue;
  const salaries = salary.total;
  const expenses = expense.total;
  return { revenue, salaries, expenses, profit: revenue - salaries - expenses };
}

export async function buildSubscriptionReport(phone?: string) {
  if (!phone) {
    const active = await countActiveSubscriptions();
    return { active, history: [] };
  }
  return { active: 1, history: await loadSubscriptionHistory(phone) };
}

export async function buildDeliveryPerformanceReport() {
  const orders = await listAllOrdersToday();
  const delivered = orders.filter((o) => o.status === 'delivered');
  const pending = orders.filter((o) => o.status !== 'delivered' && o.status !== 'booked' && o.status !== 'pickup_closed');
  const onTime = delivered.length;
  const total = delivered.length + pending.length;
  const score = total === 0 ? 100 : Math.round((onTime / total) * 100);
  return { delivered: delivered.length, pending: pending.length, performanceScore: score };
}
