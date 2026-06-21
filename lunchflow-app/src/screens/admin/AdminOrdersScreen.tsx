import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AdminCustomerDetailPanel } from '../../components/admin/AdminCustomerDetailPanel';
import { AdminFilterSelect } from '../../components/admin/AdminFilterSelect';
import { AdminKpiCard } from '../../components/admin/AdminKpiCard';
import { AdminKpiRow } from '../../components/admin/AdminKpiRow';
import { AdminNotificationBell } from '../../components/admin/AdminNotificationBell';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { Badge } from '../../components/Badge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import {
  listAllOrdersToday,
  subscribeToAllOrdersToday,
} from '../../services/orderHubService';
import { loadSubscriptionAmountsByPhone } from '../../services/subscriptionService';
import { loadRegisteredDrivers } from '../../services/userRegistryService';
import { DeliveryOrder } from '../../types/delivery';
import {
  OrderTab,
  PaymentFilter,
  countByTab,
  filterOrders,
  formatOrderDateTime,
  formatOrderDisplayId,
  getOrderAmountForCustomer,
  getOrderTab,
  getPaymentInfo,
  getTableStatusLabel,
  getTableStatusTone,
} from '../../utils/adminOrderHelpers';
import { buildCustomerDetail, CustomerDetail, formatCustomerName } from '../../utils/adminCustomerHelpers';

const PAGE_SIZE = 8;

const TABS: { id: OrderTab; label: string }[] = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending', label: 'Pending' },
  { id: 'picked_up', label: 'Picked Up' },
  { id: 'in_transit', label: 'In Transit' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

const PAYMENT_OPTIONS: { id: PaymentFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'paid', label: 'Paid' },
  { id: 'cash', label: 'Cash' },
  { id: 'upi', label: 'UPI' },
  { id: 'refunded', label: 'Refunded' },
];

function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return dateStr === today || dateStr.startsWith(today);
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function AdminOrdersScreen() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [drivers, setDrivers] = useState<Awaited<ReturnType<typeof loadRegisteredDrivers>>>([]);
  const [tab, setTab] = useState<OrderTab>('all');
  const { showMobileHeader, pageTitleSize } = useAdminLayout();
  const [query, setQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [amountsByPhone, setAmountsByPhone] = useState<Map<string, number>>(new Map());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);

  const refresh = useCallback(async () => {
    const [orderList, driverList] = await Promise.all([listAllOrdersToday(), loadRegisteredDrivers()]);
    setOrders(orderList);
    setDrivers(driverList);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => subscribeToAllOrdersToday(setOrders), []);

  useEffect(() => {
    const phones = [...new Set(orders.map((order) => order.customerPhone))];
    if (phones.length === 0) {
      setAmountsByPhone(new Map());
      return;
    }
    loadSubscriptionAmountsByPhone(phones).then(setAmountsByPhone);
  }, [orders]);

  useEffect(() => {
    if (!selectedOrderId) {
      setCustomerDetail(null);
      return;
    }
    const order = orders.find((item) => item.id === selectedOrderId);
    if (!order) {
      setCustomerDetail(null);
      return;
    }
    buildCustomerDetail(order, orders).then(setCustomerDetail);
  }, [selectedOrderId, orders]);

  useEffect(() => {
    setPage(1);
  }, [tab, query, paymentFilter, driverFilter]);

  const tabCounts = useMemo(() => countByTab(orders), [orders]);
  const todayOrders = useMemo(() => orders.filter((o) => isToday(o.date)), [orders]);
  const completed = useMemo(() => orders.filter((o) => o.status === 'delivered'), [orders]);
  const pending = useMemo(() => orders.filter((o) => getOrderTab(o.status) === 'pending'), [orders]);
  const cancelled = useMemo(() => orders.filter((o) => o.status === 'pickup_closed'), [orders]);

  const driverOptions = useMemo(
    () => [{ id: 'all', label: 'All Drivers' }, ...drivers.map((d) => ({ id: d.id, label: d.name }))],
    [drivers],
  );

  const filtered = useMemo(
    () =>
      filterOrders(orders, {
        tab,
        query,
        statusFilter: 'all',
        paymentFilter,
        driverFilter,
      }),
    [orders, tab, query, paymentFilter, driverFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageOrders = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleExport = () => {
    const rows = [
      ['Order ID', 'Customer', 'Phone', 'Pickup', 'Delivery', 'Driver', 'Status', 'Payment', 'Amount'].join(','),
      ...filtered.map((order) => {
        const payment = getPaymentInfo(order);
        return [
          formatOrderDisplayId(order.id),
          order.customerName,
          order.customerPhone,
          order.pickupAddress,
          order.school,
          order.driver?.name ?? '',
          getTableStatusLabel(order.status),
          payment.label,
          getOrderAmountForCustomer(order, amountsByPhone),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',');
      }),
    ].join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(rows);
      Alert.alert('Exported', 'Orders copied to clipboard as CSV.');
      return;
    }
    Alert.alert('Export', `${filtered.length} orders ready to export.`);
  };

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const max = Math.min(totalPages, 5);
    for (let i = 1; i <= max; i += 1) pages.push(i);
    return pages;
  }, [totalPages]);

  return (
    <AdminPageLayout wide>
      <View style={styles.header}>
        {!showMobileHeader ? (
          <View>
            <Text style={[styles.pageTitle, { fontSize: pageTitleSize }]}>Orders</Text>
          </View>
        ) : (
          <View />
        )}
        <View style={styles.headerActions}>
          <AdminNotificationBell />
        </View>
      </View>

      <AdminKpiRow>
        <AdminKpiCard label="Total Orders" value={String(orders.length)} icon="layers" iconBg={colors.purpleLight} iconColor={colors.purple} />
        <AdminKpiCard label="Today's Orders" value={String(todayOrders.length)} icon="today" iconBg={colors.blueLight} iconColor={colors.blue} />
        <AdminKpiCard label="Completed Orders" value={String(completed.length)} icon="checkmark-circle" iconBg={colors.greenLight} iconColor={colors.greenDark} />
        <AdminKpiCard label="Pending Orders" value={String(pending.length)} icon="time" iconBg={colors.yellowLight} iconColor={colors.dark} />
        <AdminKpiCard label="Cancelled Orders" value={String(cancelled.length)} icon="close-circle" iconBg={colors.redLight} iconColor={colors.red} />
      </AdminKpiRow>

      <View style={styles.toolbar}>
        <View style={styles.toolbarSearch}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            placeholder="Search Orders"
            placeholderTextColor={colors.muted}
            style={styles.toolbarSearchInput}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <AdminFilterSelect value={paymentFilter} options={PAYMENT_OPTIONS} onChange={setPaymentFilter} minWidth={120} />
        <AdminFilterSelect value={driverFilter} options={driverOptions} onChange={setDriverFilter} minWidth={130} />
      </View>

      <View style={styles.contentRow}>
      <View style={styles.tableCard}>
        <View style={styles.tabsRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {TABS.map((item) => {
              const active = tab === item.id;
              const count = tabCounts[item.id];
              return (
                <Pressable key={item.id} style={[styles.tab, active && styles.tabActive]} onPress={() => setTab(item.id)}>
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {item.label} ({count})
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable style={styles.exportBtn} onPress={handleExport}>
            <Ionicons name="download-outline" size={16} color={colors.text} />
            <Text style={styles.exportText}>Export</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator>
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, styles.colId]}>Order ID</Text>
              <Text style={[styles.th, styles.colDate]}>Date & Time</Text>
              <Text style={[styles.th, styles.colCustomer]}>Customer</Text>
              <Text style={[styles.th, styles.colPhone]}>Phone</Text>
              <Text style={[styles.th, styles.colLocation]}>Pickup Location</Text>
              <Text style={[styles.th, styles.colLocation]}>Delivery Location</Text>
              <Text style={[styles.th, styles.colDriver]}>Driver</Text>
              <Text style={[styles.th, styles.colStatus]}>Status</Text>
              <Text style={[styles.th, styles.colPayment]}>Payment</Text>
              <Text style={[styles.th, styles.colAmount]}>Amount</Text>
            </View>

            {pageOrders.length > 0 ? (
              pageOrders.map((order) => {
                const { date, time } = formatOrderDateTime(order);
                const payment = getPaymentInfo(order);
                const orderAmount = getOrderAmountForCustomer(order, amountsByPhone);
                return (
                  <Pressable
                    key={order.id}
                    style={[styles.tableRow, selectedOrderId === order.id && styles.tableRowActive]}
                    onPress={() => setSelectedOrderId(order.id)}
                  >
                    <Text style={[styles.td, styles.colId, styles.idText]}>{formatOrderDisplayId(order.id)}</Text>
                    <View style={styles.colDate}>
                      <Text style={styles.td}>{date}</Text>
                      <Text style={styles.timeText}>{time}</Text>
                    </View>
                    <View style={[styles.colCustomer, styles.personCell]}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials(order.customerName)}</Text>
                      </View>
                      <Text style={styles.td} numberOfLines={1}>
                        {formatCustomerName(order.customerName)}
                      </Text>
                    </View>
                    <View style={[styles.colPhone, styles.phoneCell]}>
                      <Ionicons name="call" size={12} color={colors.orange} />
                      <Text style={styles.td}>{order.customerPhone}</Text>
                    </View>
                    <Text style={[styles.td, styles.colLocation]} numberOfLines={2}>
                      {order.pickupAddress}
                    </Text>
                    <Text style={[styles.td, styles.colLocation]} numberOfLines={2}>
                      {order.school || order.dropAddress}
                    </Text>
                    <View style={[styles.colDriver, styles.personCell]}>
                      {order.driver ? (
                        <>
                          <View style={[styles.avatar, styles.driverAvatar]}>
                            <Text style={styles.driverAvatarText}>{order.driver.initials || initials(order.driver.name)}</Text>
                          </View>
                          <Text style={styles.td} numberOfLines={1}>
                            {order.driver.name}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.mutedTd}>Unassigned</Text>
                      )}
                    </View>
                    <View style={styles.colStatus}>
                      <Badge label={getTableStatusLabel(order.status)} tone={getTableStatusTone(order.status)} />
                    </View>
                    <View style={styles.colPayment}>
                      <Badge label={payment.label} tone={payment.tone} />
                    </View>
                    <Text style={[styles.td, styles.colAmount, styles.amountText]}>
                      ₹{orderAmount.toLocaleString('en-IN')}
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No orders match your filters.</Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.pagination}>
          <Text style={styles.pageInfo}>
            Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to{' '}
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} orders
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
            {totalPages > 5 ? <Text style={styles.pageEllipsis}>…</Text> : null}
            {totalPages > 5 ? (
              <Pressable style={styles.pageNum} onPress={() => setPage(totalPages)}>
                <Text style={styles.pageNumText}>{totalPages}</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.pageBtn} disabled={currentPage >= totalPages} onPress={() => setPage((p) => Math.min(totalPages, p + 1))}>
              <Ionicons name="chevron-forward" size={16} color={currentPage >= totalPages ? colors.border : colors.text} />
            </Pressable>
          </View>
        </View>
      </View>

      {customerDetail ? (
        <AdminCustomerDetailPanel customer={customerDetail} onClose={() => setSelectedOrderId(null)} />
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: spacing.lg },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.md,
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
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  tabsScroll: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.orange },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  tabTextActive: { color: colors.orange, fontWeight: '800' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
  },
  exportText: { fontSize: 12, fontWeight: '700', color: colors.text },
  table: { minWidth: 1080, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: 10,
  },
  tableRowActive: { backgroundColor: colors.orangeLight },
  th: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  td: { fontSize: 12, color: colors.text, fontWeight: '600' },
  mutedTd: { fontSize: 12, color: colors.muted, fontStyle: 'italic' },
  timeText: { fontSize: 11, color: colors.muted, marginTop: 2 },
  idText: { fontWeight: '800', color: colors.text },
  amountText: { fontWeight: '800' },
  colId: { width: 110 },
  colDate: { width: 100 },
  colCustomer: { width: 130 },
  colPhone: { width: 120 },
  colLocation: { width: 150 },
  colDriver: { width: 120 },
  colStatus: { width: 90 },
  colPayment: { width: 80 },
  colAmount: { width: 80 },
  personCell: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phoneCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 11, fontWeight: '800', color: colors.orange },
  driverAvatar: { backgroundColor: colors.greenLight },
  driverAvatarText: { fontSize: 10, fontWeight: '800', color: colors.greenDark },
  emptyRow: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.muted, fontWeight: '600' },
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
  pageEllipsis: { fontSize: 14, color: colors.muted, paddingHorizontal: 4 },
});
