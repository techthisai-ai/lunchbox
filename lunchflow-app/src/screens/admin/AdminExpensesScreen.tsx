import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AdminAddExpenseModal } from '../../components/admin/AdminAddExpenseModal';
import { AdminFilterSelect } from '../../components/admin/AdminFilterSelect';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { AdminTableScroll } from '../../components/admin/AdminTableScroll';
import { Badge } from '../../components/Badge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { listExpenseRecords } from '../../services/adminFinanceService';
import { ExpenseCategory, ExpenseRecord } from '../../types/finance';

const PAGE_SIZE = 8;

const CATEGORY_OPTIONS = [
  { id: 'all' as const, label: 'All Categories' },
  { id: 'fuel' as const, label: 'Fuel' },
  { id: 'packaging' as const, label: 'Packaging' },
  { id: 'maintenance' as const, label: 'Maintenance' },
  { id: 'misc' as const, label: 'Miscellaneous' },
];

const CATEGORY_META: Record<
  ExpenseCategory,
  {
    label: string;
    tone: 'orange' | 'blue' | 'green' | 'gray';
    amountColor: string;
  }
> = {
  fuel: {
    label: 'Fuel',
    tone: 'orange',
    amountColor: colors.orange,
  },
  packaging: {
    label: 'Packaging',
    tone: 'orange',
    amountColor: colors.orange,
  },
  maintenance: {
    label: 'Maintenance',
    tone: 'blue',
    amountColor: colors.blue,
  },
  misc: {
    label: 'Miscellaneous',
    tone: 'gray',
    amountColor: colors.purple,
  },
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatTodayLabel(): string {
  return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMonthLabel(month: string): string {
  const [year, monthPart] = month.split('-');
  const date = new Date(Number(year), Number(monthPart) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function formatExpenseDate(record: ExpenseRecord): string {
  const source = record.createdAt || `${record.date}T12:00:00.000Z`;
  return new Date(source).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function paymentLabel(method?: ExpenseRecord['paymentMethod']): string {
  if (method === 'upi') return 'UPI';
  if (method === 'card') return 'Card';
  return 'Cash';
}

type ExpenseKpiCardProps = {
  label: string;
  value: string;
  subtext: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
};

function ExpenseKpiCard({ label, value, subtext, icon, iconBg, iconColor, minWidth }: ExpenseKpiCardProps & { minWidth?: number }) {
  return (
    <View style={[styles.kpiCard, minWidth != null ? { minWidth } : null]}>
      <View style={[styles.kpiIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.kpiBody}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={styles.kpiValue}>{value}</Text>
        <Text style={styles.kpiSubtext}>{subtext}</Text>
      </View>
    </View>
  );
}

export function AdminExpensesScreen() {
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState(currentMonth());
  const [categoryFilter, setCategoryFilter] = useState<'all' | ExpenseCategory>('all');
  const [page, setPage] = useState(1);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const { showMobileHeader, pageTitleSize, kpiCardMinWidth } = useAdminLayout();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRecords(await listExpenseRecords());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    setPage(1);
  }, [query, monthFilter, categoryFilter]);

  const monthOptions = useMemo(() => {
    const months = new Set(records.map((record) => record.date.slice(0, 7)));
    months.add(currentMonth());
    return [...months]
      .sort((a, b) => b.localeCompare(a))
      .map((month) => ({ id: month, label: formatMonthLabel(month) }));
  }, [records]);

  const today = todayKey();
  const totalAllTime = records.reduce((sum, record) => sum + record.amount, 0);
  const todayTotal = records.filter((record) => record.date === today).reduce((sum, record) => sum + record.amount, 0);
  const monthTotal = records
    .filter((record) => record.date.startsWith(currentMonth()))
    .reduce((sum, record) => sum + record.amount, 0);

  const topCategory = useMemo(() => {
    const totals = records.reduce<Record<string, number>>((acc, record) => {
      acc[record.category] = (acc[record.category] ?? 0) + record.amount;
      return acc;
    }, {});
    const entry = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    if (!entry) return { label: '—', amount: 0 };
    return { label: CATEGORY_META[entry[0] as ExpenseCategory].label, amount: entry[1] };
  }, [records]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((record) => {
      const meta = CATEGORY_META[record.category];
      const matchesQuery =
        !q ||
        [record.title, record.notes, meta.label, record.date]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      const matchesMonth = record.date.startsWith(monthFilter);
      const matchesCategory = categoryFilter === 'all' || record.category === categoryFilter;
      return matchesQuery && matchesMonth && matchesCategory;
    });
  }, [records, query, monthFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const max = Math.min(totalPages, 4);
    for (let i = 1; i <= max; i += 1) pages.push(i);
    return pages;
  }, [totalPages]);

  const handleRowAction = (record: ExpenseRecord) => {
    Alert.alert(record.title, record.notes || 'No notes', [{ text: 'Close', style: 'cancel' }]);
  };

  return (
    <AdminPageLayout wide>
      <AdminAddExpenseModal
        visible={addExpenseOpen}
        onClose={() => setAddExpenseOpen(false)}
        onAdded={refresh}
      />
      <View style={styles.header}>
        <View style={styles.headerText}>
          {!showMobileHeader ? <Text style={[styles.pageTitle, { fontSize: pageTitleSize }]}>Expenses</Text> : null}
          {!showMobileHeader ? <Text style={styles.subtitle}>Track and manage all business expenses.</Text> : null}
        </View>
        <Pressable style={styles.addBtn} onPress={() => setAddExpenseOpen(true)}>
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.addBtnText}>Add Expense</Text>
        </Pressable>
      </View>

      <View style={styles.kpiRow}>
        <ExpenseKpiCard
          label="Total Expenses"
          value={`₹${totalAllTime.toLocaleString('en-IN')}`}
          subtext="All time"
          icon="wallet"
          iconBg={colors.orangeLight}
          iconColor={colors.orange}
          minWidth={kpiCardMinWidth}
        />
        <ExpenseKpiCard
          label="Expenses Today"
          value={`₹${todayTotal.toLocaleString('en-IN')}`}
          subtext={formatTodayLabel()}
          icon="water"
          iconBg={colors.yellowLight}
          iconColor={colors.dark}
          minWidth={kpiCardMinWidth}
        />
        <ExpenseKpiCard
          label="Expenses This Month"
          value={`₹${monthTotal.toLocaleString('en-IN')}`}
          subtext={formatMonthLabel(currentMonth())}
          icon="calendar"
          iconBg={colors.greenLight}
          iconColor={colors.greenDark}
          minWidth={kpiCardMinWidth}
        />
        <ExpenseKpiCard
          label="Top Category"
          value={topCategory.label}
          subtext={topCategory.amount > 0 ? `₹${topCategory.amount.toLocaleString('en-IN')}` : 'No data'}
          icon="pie-chart"
          iconBg={colors.purpleLight}
          iconColor={colors.purple}
          minWidth={kpiCardMinWidth}
        />
      </View>

      <View style={styles.tableCard}>
        <View style={styles.toolbar}>
          <View style={styles.toolbarSearch}>
            <Ionicons name="search" size={16} color={colors.muted} />
            <TextInput
              placeholder="Search expenses..."
              placeholderTextColor={colors.muted}
              style={styles.toolbarSearchInput}
              value={query}
              onChangeText={setQuery}
            />
          </View>
          <View style={styles.monthWrap}>
            <Ionicons name="calendar-outline" size={14} color={colors.muted} />
            <AdminFilterSelect value={monthFilter} options={monthOptions} onChange={setMonthFilter} minWidth={130} />
          </View>
          <AdminFilterSelect value={categoryFilter} options={CATEGORY_OPTIONS} onChange={setCategoryFilter} minWidth={140} />
          <Pressable style={styles.filterBtn}>
            <Ionicons name="funnel-outline" size={16} color={colors.text} />
            <Text style={styles.filterBtnText}>Filter</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>Loading expenses…</Text>
          </View>
        ) : (
          <View style={styles.tableWrap}>
            <AdminTableScroll minWidth={780}>
              <View style={styles.table}>
              <View style={styles.tableHead}>
                <View style={styles.colName}>
                  <Text style={styles.th}>Expense Name</Text>
                </View>
                <View style={styles.colCategory}>
                  <Text style={styles.th}>Category</Text>
                </View>
                <View style={styles.colAmount}>
                  <Text style={styles.th}>Amount</Text>
                </View>
                <View style={styles.colDate}>
                  <Text style={styles.th}>Date</Text>
                </View>
                <View style={styles.colPayment}>
                  <Text style={styles.th} numberOfLines={1}>
                    Payment Method
                  </Text>
                </View>
                <View style={styles.colActions}>
                  <Text style={styles.th}>Actions</Text>
                </View>
              </View>

              {pageRows.length > 0 ? (
                pageRows.map((record) => {
                  const meta = CATEGORY_META[record.category];
                  return (
                    <View key={record.id} style={styles.tableRow}>
                      <View style={styles.colName}>
                        <Text style={[styles.td, styles.expenseTitle]} numberOfLines={1}>
                          {record.title}
                        </Text>
                      </View>
                      <View style={styles.colCategory}>
                        <Badge label={meta.label} tone={meta.tone} />
                      </View>
                      <View style={styles.colAmount}>
                        <Text style={[styles.td, styles.amountText, { color: meta.amountColor }]}>
                          ₹{record.amount.toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View style={styles.colDate}>
                        <Text style={styles.td} numberOfLines={2}>
                          {formatExpenseDate(record)}
                        </Text>
                      </View>
                      <View style={styles.colPayment}>
                        <Badge label={paymentLabel(record.paymentMethod)} tone="green" />
                      </View>
                      <View style={styles.colActions}>
                        <Pressable style={styles.actionBtn} onPress={() => handleRowAction(record)}>
                          <Ionicons name="ellipsis-vertical" size={16} color={colors.muted} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyTitle}>No expenses found</Text>
                  <Text style={styles.emptyText}>Add a new expense or adjust your filters.</Text>
                </View>
              )}
              </View>
            </AdminTableScroll>
          </View>
        )}

        <View style={styles.pagination}>
          <Text style={styles.pageInfo}>
            Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to{' '}
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} entries
          </Text>
          <View style={styles.pageControls}>
            <Pressable style={styles.pageBtn} disabled={currentPage <= 1} onPress={() => setPage((p) => Math.max(1, p - 1))}>
              <Ionicons name="chevron-back" size={16} color={currentPage <= 1 ? colors.border : colors.text} />
            </Pressable>
            {pageNumbers.map((n) => (
              <Pressable key={n} style={[styles.pageNum, n === currentPage && styles.pageNumActive]} onPress={() => setPage(n)}>
                <Text style={[styles.pageNumText, n === currentPage && styles.pageNumTextActive]}>{n}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.pageBtn}
              disabled={currentPage >= totalPages}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <Ionicons name="chevron-forward" size={16} color={currentPage >= totalPages ? colors.border : colors.text} />
            </Pressable>
          </View>
        </View>
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
  headerText: { flex: 1, minWidth: 220 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 6, fontWeight: '600', lineHeight: 20 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.orange,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    height: 40,
  },
  addBtnText: { fontSize: 13, fontWeight: '800', color: colors.white },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: spacing.lg },
  kpiCard: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  kpiIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiBody: { flex: 1, minWidth: 0 },
  kpiLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  kpiValue: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 4 },
  kpiSubtext: { fontSize: 11, color: colors.muted, fontWeight: '600', marginTop: 4 },
  tableCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  toolbarSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    height: 40,
    flex: 1,
    minWidth: 180,
  },
  toolbarSearchInput: { flex: 1, fontSize: 13, color: colors.text, paddingVertical: 0 },
  monthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 170,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    height: 40,
  },
  filterBtnText: { fontSize: 13, fontWeight: '700', color: colors.text },
  tableWrap: { width: '100%', paddingHorizontal: spacing.md, paddingTop: spacing.md },
  table: { width: '100%' },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: 12,
    minHeight: 52,
  },
  th: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  td: { fontSize: 13, color: colors.text, fontWeight: '600' },
  colName: { flex: 2, minWidth: 200, flexShrink: 1 },
  colCategory: { width: 120, flexShrink: 0, justifyContent: 'center' },
  colAmount: { width: 96, flexShrink: 0, justifyContent: 'center' },
  colDate: { flex: 1, minWidth: 150, flexShrink: 1, justifyContent: 'center' },
  colPayment: { width: 120, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  colActions: { width: 56, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  expenseTitle: { fontWeight: '800' },
  amountText: { fontWeight: '800' },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  emptyRow: { paddingVertical: 48, alignItems: 'center', paddingHorizontal: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 },
  emptyText: { fontSize: 13, color: colors.muted, fontWeight: '600', textAlign: 'center' },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pageInfo: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  pageControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  pageNum: {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    backgroundColor: colors.white,
  },
  pageNumActive: { backgroundColor: colors.orange, borderColor: colors.orange },
  pageNumText: { fontSize: 12, fontWeight: '700', color: colors.text },
  pageNumTextActive: { color: colors.white },
});
