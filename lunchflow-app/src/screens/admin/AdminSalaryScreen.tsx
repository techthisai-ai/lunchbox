import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AdminFilterSelect } from '../../components/admin/AdminFilterSelect';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { AdminTableScroll } from '../../components/admin/AdminTableScroll';
import { Badge } from '../../components/Badge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { listSalaryRecords, markSalaryPaid, syncSalariesFromDrivers } from '../../services/adminFinanceService';
import { SalaryRecord } from '../../types/finance';

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  { id: 'all' as const, label: 'All Status' },
  { id: 'paid' as const, label: 'Paid' },
  { id: 'unpaid' as const, label: 'Pending' },
];

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(month: string): string {
  const [year, monthPart] = month.split('-');
  const date = new Date(Number(year), Number(monthPart) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function formatPaymentDate(paidAt?: string): string {
  if (!paidAt) return '—';
  return new Date(paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type SalaryKpiCardProps = {
  label: string;
  value: string;
  subtext: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
};

function SalaryKpiCard({ label, value, subtext, icon, iconBg, iconColor, minWidth }: SalaryKpiCardProps & { minWidth?: number }) {
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

export function AdminSalaryScreen() {
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState(currentMonth());
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [page, setPage] = useState(1);
  const { showMobileHeader, pageTitleSize, kpiCardMinWidth } = useAdminLayout();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRecords(await listSalaryRecords());
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
  }, [query, monthFilter, statusFilter]);

  const monthOptions = useMemo(() => {
    const months = new Set(records.map((record) => record.month));
    months.add(currentMonth());
    return [...months]
      .sort((a, b) => b.localeCompare(a))
      .map((month) => ({ id: month, label: formatMonthLabel(month) }));
  }, [records]);

  const monthRecords = useMemo(
    () => records.filter((record) => record.month === monthFilter),
    [records, monthFilter],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return monthRecords.filter((record) => {
      const matchesQuery =
        !q ||
        [record.employeeName, record.role, record.month, formatMonthLabel(record.month)]
          .join(' ')
          .toLowerCase()
          .includes(q);
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [monthRecords, query, statusFilter]);

  const totalPaid = monthRecords.filter((record) => record.status === 'paid').reduce((sum, record) => sum + record.amount, 0);
  const paidCount = monthRecords.filter((record) => record.status === 'paid').length;
  const pendingCount = monthRecords.filter((record) => record.status === 'unpaid').length;
  const employeeCount = new Set(monthRecords.map((record) => record.employeeId)).size;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const max = Math.min(totalPages, 4);
    for (let i = 1; i <= max; i += 1) pages.push(i);
    return pages;
  }, [totalPages]);

  const handleMarkPaid = async (id: string) => {
    await markSalaryPaid(id);
    await refresh();
  };

  const handleAddSalary = async () => {
    const added = await syncSalariesFromDrivers(monthFilter);
    if (added === 0) {
      Alert.alert('Add Salary', 'All registered employees already have salary records for this month.');
      return;
    }
    await refresh();
  };

  const handleRowAction = (record: SalaryRecord) => {
    const actions = [
      ...(record.status === 'unpaid'
        ? [{ text: 'Mark as Paid', onPress: () => handleMarkPaid(record.id) }]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ];
    Alert.alert(record.employeeName, `${record.role} · ${formatMonthLabel(record.month)}`, actions);
  };

  return (
    <AdminPageLayout wide>
      <View style={styles.header}>
        <View style={styles.headerText}>
          {!showMobileHeader ? <Text style={[styles.pageTitle, { fontSize: pageTitleSize }]}>Salary</Text> : null}
          {!showMobileHeader ? <Text style={styles.subtitle}>View and manage all employee salary payments.</Text> : null}
        </View>
        <Pressable style={styles.addBtn} onPress={handleAddSalary}>
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.addBtnText}>Add Salary</Text>
        </Pressable>
      </View>

      <View style={styles.kpiRow}>
        <SalaryKpiCard
          label="Total Salary Paid"
          value={`₹${totalPaid.toLocaleString('en-IN')}`}
          subtext="This Month"
          icon="wallet"
          iconBg={colors.orangeLight}
          iconColor={colors.orange}
          minWidth={kpiCardMinWidth}
        />
        <SalaryKpiCard
          label="Total Employees"
          value={String(employeeCount)}
          subtext="Active Employees"
          icon="people"
          iconBg={colors.purpleLight}
          iconColor={colors.purple}
          minWidth={kpiCardMinWidth}
        />
        <SalaryKpiCard
          label="Paid Employees"
          value={String(paidCount)}
          subtext="This Month"
          icon="checkmark-circle"
          iconBg={colors.greenLight}
          iconColor={colors.greenDark}
          minWidth={kpiCardMinWidth}
        />
        <SalaryKpiCard
          label="Pending Payments"
          value={String(pendingCount)}
          subtext="This Month"
          icon="time"
          iconBg={colors.yellowLight}
          iconColor={colors.dark}
          minWidth={kpiCardMinWidth}
        />
      </View>

      <View style={styles.tableCard}>
        <View style={styles.toolbar}>
          <View style={styles.toolbarSearch}>
            <Ionicons name="search" size={16} color={colors.muted} />
            <TextInput
              placeholder="Search employee"
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
          <AdminFilterSelect value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} minWidth={120} />
          <Pressable style={styles.filterBtn}>
            <Ionicons name="funnel-outline" size={16} color={colors.text} />
            <Text style={styles.filterBtnText}>Filter</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>Loading salary records…</Text>
          </View>
        ) : (
          <View style={styles.tableWrap}>
            <AdminTableScroll minWidth={820}>
              <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={[styles.th, styles.colName]}>Employee Name</Text>
                <Text style={[styles.th, styles.colRole]}>Role</Text>
                <Text style={[styles.th, styles.colMonth]}>Month</Text>
                <Text style={[styles.th, styles.colAmount]}>Amount</Text>
                <Text style={[styles.th, styles.colDate]}>Payment Date</Text>
                <Text style={[styles.th, styles.colStatus]}>Status</Text>
                <Text style={[styles.th, styles.colActions]}>Actions</Text>
              </View>

              {pageRows.length > 0 ? (
                pageRows.map((record) => (
                  <View key={record.id} style={styles.tableRow}>
                    <View style={[styles.colName, styles.personCell]}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials(record.employeeName)}</Text>
                      </View>
                      <Text style={[styles.td, styles.nameText]} numberOfLines={1}>
                        {record.employeeName}
                      </Text>
                    </View>
                    <Text style={[styles.td, styles.colRole]} numberOfLines={1}>
                      {record.role}
                    </Text>
                    <Text style={[styles.td, styles.colMonth]} numberOfLines={1}>
                      {formatMonthLabel(record.month)}
                    </Text>
                    <Text style={[styles.td, styles.colAmount, styles.amountText]}>
                      ₹{record.amount.toLocaleString('en-IN')}
                    </Text>
                    <Text style={[styles.td, styles.colDate]} numberOfLines={1}>
                      {formatPaymentDate(record.paidAt)}
                    </Text>
                    <View style={styles.colStatus}>
                      <Badge
                        label={record.status === 'paid' ? 'Paid' : 'Pending'}
                        tone={record.status === 'paid' ? 'green' : 'orange'}
                      />
                    </View>
                    <View style={styles.colActions}>
                      <Pressable style={styles.actionBtn} onPress={() => handleRowAction(record)}>
                        <Ionicons name="ellipsis-vertical" size={16} color={colors.muted} />
                      </Pressable>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyTitle}>No salary records</Text>
                  <Text style={styles.emptyText}>Add salary entries for employees using the button above.</Text>
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
    minHeight: 64,
  },
  th: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  td: { fontSize: 13, color: colors.text, fontWeight: '600' },
  nameText: { flex: 1, minWidth: 0 },
  amountText: { fontWeight: '800' },
  colName: { flex: 1.4, minWidth: 150 },
  colRole: { flex: 1, minWidth: 100 },
  colMonth: { flex: 1, minWidth: 110 },
  colAmount: { width: 96, flexShrink: 0 },
  colDate: { flex: 1, minWidth: 110 },
  colStatus: { width: 92, flexShrink: 0 },
  colActions: { width: 56, flexShrink: 0, alignItems: 'center' },
  personCell: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 11, fontWeight: '800', color: colors.orange },
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
