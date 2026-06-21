import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AdminCustomerDetailPanel } from '../../components/admin/AdminCustomerDetailPanel';
import { AdminKpiCard } from '../../components/admin/AdminKpiCard';
import { AdminKpiRow } from '../../components/admin/AdminKpiRow';
import { AdminNotificationBell } from '../../components/admin/AdminNotificationBell';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { AdminTableScroll } from '../../components/admin/AdminTableScroll';
import { Badge } from '../../components/Badge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { listAllOrdersToday } from '../../services/orderHubService';
import { loadSubscriptionAmountsByPhone } from '../../services/subscriptionService';
import { loadRegisteredCustomers, RegisteredCustomer } from '../../services/userRegistryService';
import { getDeliveryTypeLabel } from '../../types/delivery';
import {
  buildCustomerDetailByPhone,
  CustomerDetail,
  formatCustomerDisplayId,
  formatCustomerName,
} from '../../utils/adminCustomerHelpers';

const PAGE_SIZE = 8;

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function AdminCustomersScreen() {
  const [customers, setCustomers] = useState<RegisteredCustomer[]>([]);
  const [orders, setOrders] = useState<Awaited<ReturnType<typeof listAllOrdersToday>>>([]);
  const [amountsByPhone, setAmountsByPhone] = useState<Map<string, number>>(new Map());
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const { showMobileHeader, pageTitleSize } = useAdminLayout();
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [customerList, orderList] = await Promise.all([loadRegisteredCustomers(), listAllOrdersToday()]);
      setCustomers(customerList);
      setOrders(orderList);
      const phones = customerList.map((customer) => customer.phone);
      if (phones.length > 0) {
        setAmountsByPhone(await loadSubscriptionAmountsByPhone(phones));
      } else {
        setAmountsByPhone(new Map());
      }
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
  }, [query]);

  useEffect(() => {
    if (!selectedPhone) {
      setCustomerDetail(null);
      return;
    }
    buildCustomerDetailByPhone(selectedPhone, orders).then(setCustomerDetail);
  }, [selectedPhone, orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((customer) => {
      const haystack = [
        customer.name,
        customer.phone,
        formatCustomerDisplayId(customer.phone),
        customer.school,
        customer.studentName,
        getDeliveryTypeLabel(customer.registrationType),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [customers, query]);

  const activeSubscriptions = useMemo(
    () => customers.filter((customer) => (amountsByPhone.get(customer.phone) ?? 0) > 0).length,
    [customers, amountsByPhone],
  );
  const studentCount = customers.filter((c) => c.registrationType === 'school').length;
  const collegeCount = customers.filter((c) => c.registrationType === 'college').length;
  const officeCount = customers.filter((c) => c.registrationType === 'office').length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const max = Math.min(totalPages, 4);
    for (let i = 1; i <= max; i += 1) pages.push(i);
    return pages;
  }, [totalPages]);

  return (
    <AdminPageLayout wide>
      <View style={styles.header}>
        {!showMobileHeader ? (
          <View>
            <Text style={[styles.pageTitle, { fontSize: pageTitleSize }]}>Customers</Text>
          </View>
        ) : (
          <View />
        )}
        <View style={styles.headerActions}>
          <AdminNotificationBell />
        </View>
      </View>

      <AdminKpiRow>
        <AdminKpiCard label="Total Customers" value={String(customers.length)} icon="people" iconBg={colors.purpleLight} iconColor={colors.purple} />
        <AdminKpiCard label="Active Subscriptions" value={String(activeSubscriptions)} icon="card" iconBg={colors.greenLight} iconColor={colors.greenDark} />
        <AdminKpiCard label="Students" value={String(studentCount)} icon="school" iconBg={colors.blueLight} iconColor={colors.blue} />
        <AdminKpiCard label="College / Office" value={String(collegeCount + officeCount)} icon="business" iconBg={colors.yellowLight} iconColor={colors.dark} />
      </AdminKpiRow>

      <View style={styles.toolbar}>
        <View style={styles.toolbarSearch}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            placeholder="Search customers by name, phone..."
            placeholderTextColor={colors.muted}
            style={styles.toolbarSearchInput}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.tableCard}>
          {loading ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>Loading customers…</Text>
            </View>
          ) : (
            <View style={styles.tableWrap}>
              <AdminTableScroll minWidth={860}>
                <View style={styles.table}>
                <View style={styles.tableHead}>
                  <Text style={[styles.th, styles.colId]}>Customer ID</Text>
                  <Text style={[styles.th, styles.colName]}>Customer Name</Text>
                  <Text style={[styles.th, styles.colPhone]}>Phone</Text>
                  <Text style={[styles.th, styles.colType]}>Type</Text>
                  <Text style={[styles.th, styles.colSchool]}>School / Office</Text>
                  <Text style={[styles.th, styles.colSub]}>Subscription</Text>
                  <Text style={[styles.th, styles.colStatus]}>Status</Text>
                </View>

                {pageRows.length > 0 ? (
                  pageRows.map((customer) => {
                    const displayName = formatCustomerName(customer.name);
                    const amount = amountsByPhone.get(customer.phone) ?? 0;
                    const isActive = amount > 0;
                    return (
                      <Pressable
                        key={customer.phone}
                        style={[styles.tableRow, selectedPhone === customer.phone && styles.tableRowActive]}
                        onPress={() => setSelectedPhone(customer.phone)}
                      >
                        <Text style={[styles.td, styles.colId, styles.idText]}>{formatCustomerDisplayId(customer.phone)}</Text>
                        <View style={[styles.colName, styles.personCell]}>
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials(displayName)}</Text>
                          </View>
                          <Text style={[styles.td, styles.nameText]} numberOfLines={1}>
                            {displayName}
                          </Text>
                        </View>
                        <Text style={[styles.td, styles.colPhone]}>+91 {customer.phone}</Text>
                        <View style={styles.colType}>
                          <Badge label={getDeliveryTypeLabel(customer.registrationType)} tone="blue" />
                        </View>
                        <Text style={[styles.td, styles.colSchool]} numberOfLines={2}>
                          {customer.school || '—'}
                        </Text>
                        <Text style={[styles.td, styles.colSub, styles.earningsText]}>
                          {isActive ? `₹${amount.toLocaleString('en-IN')}` : '—'}
                        </Text>
                        <View style={styles.colStatus}>
                          <Badge label={isActive ? 'Active' : 'Inactive'} tone={isActive ? 'green' : 'gray'} />
                        </View>
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyTitle}>No customers yet</Text>
                    <Text style={styles.emptyText}>Customers appear here after they register in the app.</Text>
                  </View>
                )}
                </View>
              </AdminTableScroll>
            </View>
          )}

          <View style={styles.pagination}>
            <Text style={styles.pageInfo}>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to{' '}
              {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} customers
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
              <Pressable style={styles.pageBtn} disabled={currentPage >= totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))}>
                <Ionicons name="chevron-forward" size={16} color={currentPage >= totalPages ? colors.border : colors.text} />
              </Pressable>
            </View>
          </View>
        </View>

        {customerDetail ? (
          <AdminCustomerDetailPanel customer={customerDetail} onClose={() => setSelectedPhone(null)} />
        ) : null}
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: spacing.lg },
  toolbar: { flexDirection: 'row', marginBottom: spacing.md },
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
    minWidth: 220,
  },
  toolbarSearchInput: { flex: 1, fontSize: 13, color: colors.text, paddingVertical: 0 },
  contentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  tableCard: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
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
  tableRowActive: { backgroundColor: colors.orangeLight },
  th: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  td: { fontSize: 13, color: colors.text, fontWeight: '600' },
  nameText: { flex: 1, minWidth: 0 },
  idText: { fontWeight: '800' },
  earningsText: { fontWeight: '800' },
  colId: { width: 88, flexShrink: 0 },
  colName: { flex: 1.3, minWidth: 140 },
  colPhone: { flex: 1, minWidth: 110 },
  colType: { width: 88, flexShrink: 0 },
  colSchool: { flex: 1.2, minWidth: 120 },
  colSub: { width: 88, flexShrink: 0 },
  colStatus: { width: 88, flexShrink: 0 },
  personCell: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 11, fontWeight: '800', color: colors.orange },
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
