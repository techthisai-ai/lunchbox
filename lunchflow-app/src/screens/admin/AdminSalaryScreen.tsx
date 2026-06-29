import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AdminAddSalaryModal } from '../../components/admin/AdminAddSalaryModal';
import { AdminFilterSelect } from '../../components/admin/AdminFilterSelect';
import { AdminKpiCard } from '../../components/admin/AdminKpiCard';
import { AdminKpiRow } from '../../components/admin/AdminKpiRow';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { AdminTableScroll } from '../../components/admin/AdminTableScroll';
import { Badge } from '../../components/Badge';
import { colors, radius, spacing } from '../../constants/theme';
import { listSalaryRecords } from '../../services/adminFinanceService';
import { SalaryRecord } from '../../types/finance';
import { buildMonthFilterOptions, currentMonthKey, formatMonthLabel } from '../../utils/adminMonthHelpers';

const STATUS_OPTIONS = [
  { id: 'all' as const, label: 'All Status' },
  { id: 'paid' as const, label: 'Paid' },
  { id: 'unpaid' as const, label: 'Pending' },
];

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

export function AdminSalaryScreen() {
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState(currentMonthKey());
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [addSalaryOpen, setAddSalaryOpen] = useState(false);
  const [salaryDefaults, setSalaryDefaults] = useState<{ employeeName: string; role: string } | null>(null);

  const openAddSalary = (defaults?: { employeeName: string; role: string }) => {
    setSalaryDefaults(defaults ?? null);
    setAddSalaryOpen(true);
  };

  const closeAddSalary = () => {
    setAddSalaryOpen(false);
    setSalaryDefaults(null);
  };

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

  const monthOptions = useMemo(
    () => buildMonthFilterOptions(records.map((record) => record.month)),
    [records],
  );

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

  return (
    <AdminPageLayout wide>
      <AdminAddSalaryModal
        visible={addSalaryOpen}
        onClose={closeAddSalary}
        onAdded={refresh}
        defaultMonth={monthFilter}
        defaultEmployeeName={salaryDefaults?.employeeName}
        defaultRole={salaryDefaults?.role}
      />

      <View style={styles.header}>
        <Pressable style={styles.addBtn} onPress={() => openAddSalary()}>
          <Ionicons name="add" size={18} color={colors.white} />
          <Text style={styles.addBtnText}>Add Salary</Text>
        </Pressable>
      </View>

      <AdminKpiRow dense>
        <AdminKpiCard compact label="Total Salary Paid" value={`₹${totalPaid.toLocaleString('en-IN')}`} icon="wallet" iconBg={colors.orangeLight} iconColor={colors.orange} />
        <AdminKpiCard compact label="Total Employees" value={String(employeeCount)} icon="people" iconBg={colors.purpleLight} iconColor={colors.purple} />
        <AdminKpiCard compact label="Paid Employees" value={String(paidCount)} icon="checkmark-circle" iconBg={colors.greenLight} iconColor={colors.greenDark} />
        <AdminKpiCard compact label="Pending Payments" value={String(pendingCount)} icon="time" iconBg={colors.yellowLight} iconColor={colors.dark} />
      </AdminKpiRow>

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
          <AdminFilterSelect
            value={monthFilter}
            options={monthOptions}
            onChange={setMonthFilter}
            minWidth={160}
            leadingIcon="calendar-outline"
          />
          <AdminFilterSelect value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} minWidth={120} />
        </View>

        {loading ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>Loading salary records…</Text>
          </View>
        ) : (
          <View style={styles.tableWrap}>
            <AdminTableScroll minWidth={900}>
              <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={[styles.th, styles.colName]}>Employee Name</Text>
                <Text style={[styles.th, styles.colRole]}>Role</Text>
                <Text style={[styles.th, styles.colMonth]}>Month</Text>
                <Text style={[styles.th, styles.colAmount]}>Amount</Text>
                <Text style={[styles.th, styles.colDate]}>Payment Date</Text>
                <Text style={[styles.th, styles.colStatus]}>Status</Text>
                <Text style={[styles.th, styles.colAction]}>Action</Text>
              </View>

              {filtered.length > 0 ? (
                filtered.map((record) => (
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
                    <View style={styles.colAction}>
                      <Pressable
                        style={styles.rowSalaryBtn}
                        onPress={() =>
                          openAddSalary({ employeeName: record.employeeName, role: record.role })
                        }
                      >
                        <Text style={styles.rowSalaryBtnText}>Salary</Text>
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
      </View>
    </AdminPageLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.md,
  },
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
  colAction: { width: 72, flexShrink: 0, alignItems: 'center' },
  rowSalaryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.orange,
    minWidth: 58,
    alignItems: 'center',
  },
  rowSalaryBtnText: { fontSize: 11, fontWeight: '800', color: colors.onPrimary },
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
  emptyRow: { paddingVertical: 48, alignItems: 'center', paddingHorizontal: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 },
  emptyText: { fontSize: 13, color: colors.muted, fontWeight: '600', textAlign: 'center' },
});
