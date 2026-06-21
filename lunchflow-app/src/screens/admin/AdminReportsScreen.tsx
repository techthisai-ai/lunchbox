import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { AdminKpiCard } from '../../components/admin/AdminKpiCard';
import { AdminKpiRow } from '../../components/admin/AdminKpiRow';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { AdminPanel } from '../../components/admin/AdminPanel';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { listAllOrdersToday } from '../../services/orderHubService';
import {
  buildDailySalesReport,
  buildExpenseReport,
  buildMonthlyRevenueReport,
  buildProfitLossReport,
  buildSalaryReport,
  buildSubscriptionReport,
} from '../../services/reportsService';
import { DeliveryOrder } from '../../types/delivery';

const EXPENSE_LABELS: Record<string, string> = {
  fuel: 'Fuel',
  packaging: 'Packaging',
  maintenance: 'Maintenance',
  misc: 'Miscellaneous',
};

function formatTodayDate(): string {
  return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function orderBreakdown(orders: DeliveryOrder[]) {
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((order) => order.date === today || order.date.startsWith(today));
  const delivered = todayOrders.filter((order) => order.status === 'delivered');
  const pending = todayOrders.filter(
    (order) => order.status !== 'delivered' && order.status !== 'pickup_closed' && order.status !== 'booked',
  );
  const cancelled = todayOrders.filter((order) => order.status === 'pickup_closed');
  const inTransit = todayOrders.filter(
    (order) => order.status === 'in_transit' || order.status === 'picked_up' || order.status === 'at_drop',
  );
  return { todayOrders, delivered, pending, cancelled, inTransit };
}

function downloadReport(lines: string[]) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    Alert.alert('Export', lines.join('\n'));
    return;
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lunchflow-report-${new Date().toISOString().slice(0, 10)}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

type BreakdownRowProps = {
  label: string;
  value: string;
  valueColor?: string;
};

function BreakdownRow({ label, value, valueColor }: BreakdownRowProps) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={[styles.breakdownValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

export function AdminReportsScreen() {
  const [daily, setDaily] = useState({ totalOrders: 0, deliveredOrders: 0, revenue: 0, date: '' });
  const { showMobileHeader, pageTitleSize } = useAdminLayout();
  const [monthly, setMonthly] = useState({ month: '', revenue: 0, orders: 0, subscriptions: 0 });
  const [salary, setSalary] = useState({ total: 0, paid: 0, unpaid: 0 });
  const [expense, setExpense] = useState({ total: 0, byCategory: {} as Record<string, number> });
  const [profit, setProfit] = useState({ revenue: 0, salaries: 0, expenses: 0, profit: 0 });
  const [subs, setSubs] = useState({ active: 0 });
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);

  const refresh = useCallback(async () => {
    const [dailyReport, monthlyReport, salaryReport, expenseReport, profitReport, subsReport, orderList] = await Promise.all([
      buildDailySalesReport(),
      buildMonthlyRevenueReport(),
      buildSalaryReport(),
      buildExpenseReport(),
      buildProfitLossReport(),
      buildSubscriptionReport(),
      listAllOrdersToday(),
    ]);
    setDaily(dailyReport);
    setMonthly(monthlyReport);
    setSalary({ total: salaryReport.total, paid: salaryReport.paid, unpaid: salaryReport.unpaid });
    setExpense({ total: expenseReport.total, byCategory: expenseReport.byCategory });
    setProfit(profitReport);
    setSubs(subsReport);
    setOrders(orderList);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const breakdown = useMemo(() => orderBreakdown(orders), [orders]);
  const profitAmount = Math.max(0, profit.profit);
  const lossAmount = Math.max(0, -profit.profit);
  const profitColor = profit.profit < 0 ? colors.red : colors.text;
  const expenseRows = Object.entries(expense.byCategory).sort((a, b) => b[1] - a[1]);

  const handleExport = () => {
    downloadReport([
      `LunchFlow Report — ${formatTodayDate()}`,
      '',
      `Daily Revenue: ${formatCurrency(daily.revenue)}`,
      `Monthly Revenue: ${formatCurrency(monthly.revenue)}`,
      `Active Subscriptions: ${subs.active}`,
      `Salary Paid: ${formatCurrency(salary.paid)}`,
      `Salary Unpaid: ${formatCurrency(salary.unpaid)}`,
      `Total Expenses: ${formatCurrency(expense.total)}`,
      `Profit: ${formatCurrency(profitAmount)}`,
      `Loss: ${formatCurrency(lossAmount)}`,
      `Net: ${formatCurrency(profit.profit)}`,
    ]);
  };

  return (
    <AdminPageLayout wide>
      <View style={styles.header}>
        <View>
          {!showMobileHeader ? <Text style={[styles.pageTitle, { fontSize: pageTitleSize }]}>Reports</Text> : null}
        </View>
        <View style={styles.headerActions}>
          <View style={styles.datePill}>
            <Ionicons name="calendar-outline" size={16} color={colors.muted} />
            <Text style={styles.dateText}>{formatTodayDate()}</Text>
          </View>
          <Pressable style={styles.exportBtn} onPress={handleExport}>
            <Ionicons name="download-outline" size={16} color={colors.white} />
            <Text style={styles.exportText}>Export Report</Text>
          </Pressable>
        </View>
      </View>

      <AdminKpiRow>
        <AdminKpiCard
          label="Daily Revenue"
          value={formatCurrency(daily.revenue)}
          icon="wallet"
          iconBg={colors.purpleLight}
          iconColor={colors.purple}
        />
        <AdminKpiCard
          label="Monthly Revenue"
          value={formatCurrency(monthly.revenue)}
          icon="bar-chart"
          iconBg={colors.greenLight}
          iconColor={colors.greenDark}
        />
        <AdminKpiCard
          label="Active Subscriptions"
          value={String(subs.active)}
          icon="people"
          iconBg={colors.blueLight}
          iconColor={colors.blue}
        />
        <AdminKpiCard
          label="Profit"
          value={formatCurrency(profitAmount)}
          icon="trending-up"
          iconBg={colors.greenLight}
          iconColor={colors.greenDark}
          valueColor={profitAmount > 0 ? colors.greenDark : colors.text}
        />
        <AdminKpiCard
          label="Loss"
          value={formatCurrency(lossAmount)}
          icon="trending-down"
          iconBg={colors.redLight}
          iconColor={colors.red}
          valueColor={lossAmount > 0 ? colors.red : colors.text}
        />
      </AdminKpiRow>

      <AdminKpiRow>
        <AdminKpiCard
          label="Salary Paid"
          value={formatCurrency(salary.paid)}
          icon="cash"
          iconBg={colors.greenLight}
          iconColor={colors.greenDark}
        />
        <AdminKpiCard
          label="Total Expenses"
          value={formatCurrency(expense.total)}
          icon="card"
          iconBg={colors.yellowLight}
          iconColor={colors.dark}
        />
      </AdminKpiRow>

      <View style={styles.bottomRow}>
        <AdminPanel title="Orders Today" style={styles.panel}>
          <BreakdownRow label="Total Orders" value={String(breakdown.todayOrders.length)} />
          <BreakdownRow label="Delivered" value={String(breakdown.delivered.length)} />
          <BreakdownRow label="In Transit" value={String(breakdown.inTransit.length)} />
          <BreakdownRow label="Pending" value={String(breakdown.pending.length)} />
          <BreakdownRow label="Cancelled" value={String(breakdown.cancelled.length)} />
        </AdminPanel>

        <AdminPanel title="Expense Breakdown" style={styles.panel}>
          {expenseRows.length > 0 ? (
            expenseRows.map(([category, amount]) => (
              <BreakdownRow
                key={category}
                label={EXPENSE_LABELS[category] ?? category}
                value={formatCurrency(amount)}
              />
            ))
          ) : (
            <Text style={styles.empty}>No expenses recorded yet.</Text>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(expense.total)}</Text>
          </View>
        </AdminPanel>

        <AdminPanel title="Profit & Loss" style={styles.panel}>
          <BreakdownRow label="Revenue (Today)" value={formatCurrency(profit.revenue)} />
          <BreakdownRow label="Salaries" value={`-${formatCurrency(profit.salaries)}`} valueColor={colors.red} />
          <BreakdownRow label="Expenses" value={`-${formatCurrency(profit.expenses)}`} valueColor={colors.red} />
          <View style={styles.divider} />
          <BreakdownRow label="Salary Unpaid" value={formatCurrency(salary.unpaid)} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Net Profit / Loss</Text>
            <Text style={[styles.totalValue, { color: profitColor }]}>{formatCurrency(profit.profit)}</Text>
          </View>
        </AdminPanel>
      </View>
    </AdminPageLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: spacing.lg,
  },
  pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
  breadcrumb: { fontSize: 13, color: colors.muted, marginTop: 4, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    height: 40,
  },
  dateText: { fontSize: 13, color: colors.text, fontWeight: '600' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.orange,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    height: 40,
  },
  exportText: { fontSize: 13, fontWeight: '700', color: colors.white },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  bottomRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  panel: { flex: 1, minWidth: 0, width: '100%' },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  breakdownLabel: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  breakdownValue: { fontSize: 14, fontWeight: '800', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 14,
    marginTop: 4,
  },
  totalLabel: { fontSize: 14, fontWeight: '800', color: colors.text },
  totalValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  empty: { fontSize: 13, color: colors.muted, paddingVertical: 12 },
});
