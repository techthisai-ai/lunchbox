import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AdminTableScroll } from '../../components/admin/AdminTableScroll';
import { AdminSearchField } from '../../components/admin/AdminSearchField';
import { AdminAddCategoryModal } from '../../components/admin/AdminAddCategoryModal';
import { AdminAddExpenseModal } from '../../components/admin/AdminAddExpenseModal';
import { AdminFilterSelect } from '../../components/admin/AdminFilterSelect';
import { AdminKpiCard } from '../../components/admin/AdminKpiCard';
import { AdminKpiRow } from '../../components/admin/AdminKpiRow';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { Badge } from '../../components/Badge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { useAdminTableColumn } from '../../hooks/useAdminTableColumn';
import { listExpenseCategories, listExpenseRecords } from '../../services/adminFinanceService';
import { ExpenseCategoryDef, ExpenseRecord } from '../../types/finance';
import { buildMonthFilterOptions, currentMonthKey } from '../../utils/adminMonthHelpers';

const CATEGORY_TONE: Record<string, 'orange' | 'blue' | 'green' | 'gray'> = {
  fuel: 'orange',
  packaging: 'orange',
  maintenance: 'blue',
  misc: 'gray',
};

const CATEGORY_AMOUNT_COLOR: Record<string, string> = {
  fuel: colors.orange,
  packaging: colors.orange,
  maintenance: colors.blue,
  misc: colors.purple,
};

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
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

function getCategoryLabel(id: string, categories: ExpenseCategoryDef[]): string {
  return categories.find((category) => category.id === id)?.label ?? id;
}

function getCategoryTone(id: string): 'orange' | 'blue' | 'green' | 'gray' {
  return CATEGORY_TONE[id] ?? 'gray';
}

function getCategoryAmountColor(id: string): string {
  return CATEGORY_AMOUNT_COLOR[id] ?? colors.text;
}

export function AdminExpensesScreen() {
  const { isSidebarCollapsed } = useAdminLayout();
  const col = useAdminTableColumn();
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState(currentMonthKey());
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [expenses, categoryList] = await Promise.all([listExpenseRecords(), listExpenseCategories()]);
      setRecords(expenses);
      setCategories(categoryList);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const categoryOptions = useMemo(
    () => [{ id: 'all' as const, label: 'All Categories' }, ...categories.map((category) => ({ id: category.id, label: category.label }))],
    [categories],
  );

  const monthOptions = useMemo(
    () => buildMonthFilterOptions(records.map((record) => record.date.slice(0, 7))),
    [records],
  );

  const today = todayKey();
  const currentYear = String(new Date().getFullYear());
  const totalAllTime = records.reduce((sum, record) => sum + record.amount, 0);
  const todayTotal = records.filter((record) => record.date === today).reduce((sum, record) => sum + record.amount, 0);
  const monthTotal = records
    .filter((record) => record.date.startsWith(currentMonthKey()))
    .reduce((sum, record) => sum + record.amount, 0);
  const yearTotal = records
    .filter((record) => record.date.startsWith(currentYear))
    .reduce((sum, record) => sum + record.amount, 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((record) => {
      const label = getCategoryLabel(record.category, categories);
      const matchesQuery =
        !q ||
        [record.title, record.notes, label, record.date]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      const matchesMonth = record.date.startsWith(monthFilter);
      const matchesCategory = categoryFilter === 'all' || record.category === categoryFilter;
      return matchesQuery && matchesMonth && matchesCategory;
    });
  }, [records, query, monthFilter, categoryFilter, categories]);

  return (
    <AdminPageLayout wide>
      <AdminAddExpenseModal visible={addExpenseOpen} onClose={() => setAddExpenseOpen(false)} onAdded={refresh} />
      <AdminAddCategoryModal visible={addCategoryOpen} onClose={() => setAddCategoryOpen(false)} onAdded={refresh} />

      <View style={[styles.header, isSidebarCollapsed && styles.headerCompact]}>
        <Pressable style={[styles.addCategoryBtn, isSidebarCollapsed && styles.headerBtnFull]} onPress={() => setAddCategoryOpen(true)}>
          <Ionicons name="pricetag-outline" size={18} color={colors.text} />
          <Text style={styles.addCategoryBtnText}>Add Category</Text>
        </Pressable>
        <Pressable style={[styles.addBtn, isSidebarCollapsed && styles.headerBtnFull]} onPress={() => setAddExpenseOpen(true)}>
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.addBtnText}>Add Expense</Text>
        </Pressable>
      </View>

      <AdminKpiRow dense>
        <AdminKpiCard compact label="Total Expenses" value={`₹${totalAllTime.toLocaleString('en-IN')}`} icon="wallet" iconBg={colors.orangeLight} iconColor={colors.orange} />
        <AdminKpiCard compact label="Expenses Today" value={`₹${todayTotal.toLocaleString('en-IN')}`} icon="water" iconBg={colors.yellowLight} iconColor={colors.dark} />
        <AdminKpiCard compact label="Expenses This Month" value={`₹${monthTotal.toLocaleString('en-IN')}`} icon="calendar" iconBg={colors.greenLight} iconColor={colors.greenDark} />
        <AdminKpiCard compact label="Expenses This Year" value={`₹${yearTotal.toLocaleString('en-IN')}`} icon="stats-chart" iconBg={colors.blueLight} iconColor={colors.blue} />
      </AdminKpiRow>

      <View style={styles.tableCard}>
        <View style={[styles.toolbar, isSidebarCollapsed && styles.toolbarMobile]}>
          <AdminSearchField
            placeholder="Search expenses..."
            value={query}
            onChangeText={setQuery}
            fullWidth={isSidebarCollapsed}
          />
          <View style={[styles.toolbarFilters, isSidebarCollapsed && styles.toolbarFiltersMobile]}>
            <AdminFilterSelect
              value={monthFilter}
              options={monthOptions}
              onChange={setMonthFilter}
              minWidth={160}
              fullWidth={isSidebarCollapsed}
              leadingIcon="calendar-outline"
            />
            <AdminFilterSelect value={categoryFilter} options={categoryOptions} onChange={setCategoryFilter} minWidth={140} fullWidth={isSidebarCollapsed} />
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>Loading expenses…</Text>
          </View>
        ) : (
          <View style={styles.tableWrap}>
            <AdminTableScroll minWidth={720}>
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <View style={col(1.45, 180, { overflow: 'hidden' })}>
                  <Text style={[styles.th, styles.cellText]} numberOfLines={1}>
                    Expense Name
                  </Text>
                </View>
                <View style={col(0.9, 115, { alignItems: 'flex-start', overflow: 'hidden' })}>
                  <Text style={[styles.th, styles.cellText]} numberOfLines={1}>
                    Category
                  </Text>
                </View>
                <View style={col(0.7, 95, { alignItems: 'flex-start', overflow: 'hidden' })}>
                  <Text style={[styles.th, styles.cellText]} numberOfLines={1}>
                    Amount
                  </Text>
                </View>
                <View style={col(1.15, 155, { overflow: 'hidden' })}>
                  <Text style={[styles.th, styles.cellText]} numberOfLines={1}>
                    Date
                  </Text>
                </View>
                <View style={col(0.65, 90, { alignItems: 'flex-start', overflow: 'hidden' })}>
                  <Text style={[styles.th, styles.cellText]} numberOfLines={1}>
                    Payment
                  </Text>
                </View>
              </View>

              {filtered.length > 0 ? (
                filtered.map((record) => {
                  const label = getCategoryLabel(record.category, categories);
                  const tone = getCategoryTone(record.category);
                  const amountColor = getCategoryAmountColor(record.category);
                  return (
                    <View key={record.id} style={styles.tableRow}>
                      <View style={col(1.45, 180, { overflow: 'hidden' })}>
                        <Text style={[styles.td, styles.expenseTitle, styles.cellText]} numberOfLines={1}>
                          {record.title}
                        </Text>
                      </View>
                      <View style={col(0.9, 115, { alignItems: 'flex-start', overflow: 'hidden' })}>
                        <Badge label={label} tone={tone} />
                      </View>
                      <View style={col(0.7, 95, { alignItems: 'flex-start', overflow: 'hidden' })}>
                        <Text style={[styles.td, styles.amountText, styles.cellText, { color: amountColor }]} numberOfLines={1}>
                          ₹{record.amount.toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View style={col(1.15, 155, { overflow: 'hidden' })}>
                        <Text style={[styles.td, styles.cellText]} numberOfLines={1}>
                          {formatExpenseDate(record)}
                        </Text>
                      </View>
                      <View style={col(0.65, 90, { alignItems: 'flex-start', overflow: 'hidden' })}>
                        <Badge label={paymentLabel(record.paymentMethod)} tone="green" />
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
      </View>
    </AdminPageLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  headerCompact: { flexDirection: 'column', alignItems: 'stretch' },
  headerBtnFull: { width: '100%', justifyContent: 'center' },
  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    height: 40,
  },
  addCategoryBtnText: { fontSize: 13, fontWeight: '800', color: colors.text },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.orange,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    height: 40,
  },
  addBtnText: { fontSize: 13, fontWeight: '800', color: colors.onPrimary },
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
  toolbarMobile: { flexDirection: 'column', alignItems: 'stretch' },
  toolbarFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  toolbarFiltersMobile: { width: '100%', flexDirection: 'column', flex: 0, alignItems: 'stretch' },
  tableWrap: { width: '100%', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.md },
  table: { width: '100%' },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: 8,
  },
  th: { fontSize: 10, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  td: { fontSize: 12, color: colors.text, fontWeight: '600' },
  cellText: { width: '100%', minWidth: 0 },
  expenseTitle: { fontWeight: '800' },
  amountText: { fontWeight: '800' },
  emptyRow: { paddingVertical: 48, alignItems: 'center', paddingHorizontal: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 },
  emptyText: { fontSize: 13, color: colors.muted, fontWeight: '600', textAlign: 'center' },
});
