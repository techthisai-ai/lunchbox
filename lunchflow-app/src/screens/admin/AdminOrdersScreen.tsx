import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminCustomerDetailPanel } from '../../components/admin/AdminCustomerDetailPanel';
import { AdminMobileOverlay } from '../../components/admin/AdminMobileOverlay';
import { AdminTableScroll } from '../../components/admin/AdminTableScroll';
import { AdminSearchField } from '../../components/admin/AdminSearchField';
import { AdminFilterSelect } from '../../components/admin/AdminFilterSelect';
import { AdminKpiCard } from '../../components/admin/AdminKpiCard';
import { AdminKpiRow } from '../../components/admin/AdminKpiRow';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { Badge } from '../../components/Badge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { useAdminTableColumn } from '../../hooks/useAdminTableColumn';
import {
  assignDriverByAdmin,
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

function formatOrderDateTimeLabel(order: DeliveryOrder): string {
  const { date, time } = formatOrderDateTime(order);
  if (time === '—') return date;
  if (isToday(order.date)) return time;
  return `${date} · ${time}`;
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
  const { showMobileHeader, pageTitleSize, isSidebarCollapsed } = useAdminLayout();
  const col = useAdminTableColumn();
  const c = {
    id: col(1.05, 100),
    date: col(0.95, 115),
    customer: col(1.15, 150),
    phone: col(1.05, 110),
    location: col(1.05, 130),
    driver: col(1.05, 130),
    status: col(0.75, 92, { alignItems: 'flex-start' }),
    payment: col(0.65, 78, { alignItems: 'flex-start' }),
    amount: col(0.6, 72, { alignItems: 'flex-end' }),
  };
  const [query, setQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [driverFilter, setDriverFilter] = useState('all');
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

  const handleExport = () => {
    if (filtered.length === 0) {
      Alert.alert('No orders', 'No orders match your current filters.');
      return;
    }

    const csv = [
      ['Order ID', 'Customer', 'Phone', 'Pickup', 'Delivery', 'Driver', 'Status', 'Payment', 'Amount'].join(','),
      ...filtered.map((order) => {
        const payment = getPaymentInfo(order);
        return [
          formatOrderDisplayId(order.id),
          order.customerName,
          order.customerPhone,
          order.pickupAddress,
          order.school || order.dropAddress,
          order.driver?.name ?? '',
          getTableStatusLabel(order.status),
          payment.label,
          getOrderAmountForCustomer(order, amountsByPhone),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',');
      }),
    ].join('\n');

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lunchflow-orders-${new Date().toISOString().slice(0, 10)}.csv`;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(csv).then(
        () => Alert.alert('Exported', 'Orders copied to clipboard as CSV.'),
        () => Alert.alert('Export failed', 'Could not copy orders to clipboard.'),
      );
      return;
    }

    Alert.alert('Export', `${filtered.length} orders ready to export.`);
  };

  return (
    <AdminPageLayout wide>
      {!showMobileHeader ? (
          <View>
            <Text style={[styles.pageTitle, { fontSize: pageTitleSize }]}>Orders</Text>
          </View>
        ) : null}

      <AdminKpiRow dense>
        <AdminKpiCard compact label="Total Orders" value={String(orders.length)} icon="layers" iconBg={colors.purpleLight} iconColor={colors.purple} />
        <AdminKpiCard compact label="Today's Orders" value={String(todayOrders.length)} icon="today" iconBg={colors.blueLight} iconColor={colors.blue} />
        <AdminKpiCard compact label="Completed Orders" value={String(completed.length)} icon="checkmark-circle" iconBg={colors.greenLight} iconColor={colors.greenDark} />
        <AdminKpiCard compact label="Pending Orders" value={String(pending.length)} icon="time" iconBg={colors.yellowLight} iconColor={colors.dark} />
        <AdminKpiCard compact label="Cancelled Orders" value={String(cancelled.length)} icon="close-circle" iconBg={colors.redLight} iconColor={colors.red} />
      </AdminKpiRow>

      <View style={[styles.filtersCard, isSidebarCollapsed && styles.filtersCardMobile]}>
        <AdminSearchField
          placeholder="Search Orders"
          value={query}
          onChangeText={setQuery}
          fullWidth={isSidebarCollapsed}
        />
        <View style={[styles.toolbarFilters, isSidebarCollapsed && styles.toolbarFiltersMobile]}>
          <AdminFilterSelect
            label={isSidebarCollapsed ? 'Payment' : undefined}
            value={paymentFilter}
            options={PAYMENT_OPTIONS}
            onChange={setPaymentFilter}
            minWidth={120}
            flex={isSidebarCollapsed}
            fullWidth={false}
          />
          <AdminFilterSelect
            label={isSidebarCollapsed ? 'Driver' : undefined}
            value={driverFilter}
            options={driverOptions}
            onChange={setDriverFilter}
            minWidth={130}
            flex={isSidebarCollapsed}
            fullWidth={false}
          />
        </View>
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

        <AdminTableScroll minWidth={980}>
        <View style={styles.tableWrap}>
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <View style={c.id}><Text style={styles.th}>Order ID</Text></View>
              <View style={c.date}><Text style={styles.th}>Date & Time</Text></View>
              <View style={c.customer}><Text style={styles.th}>Customer</Text></View>
              <View style={c.phone}><Text style={styles.th}>Phone</Text></View>
              <View style={c.location}><Text style={styles.th}>Pickup</Text></View>
              <View style={c.location}><Text style={styles.th}>Delivery</Text></View>
              <View style={c.driver}><Text style={styles.th}>Driver</Text></View>
              <View style={c.status}><Text style={styles.th}>Status</Text></View>
              <View style={c.payment}><Text style={styles.th}>Payment</Text></View>
              <View style={c.amount}><Text style={styles.th}>Amount</Text></View>
            </View>

            {filtered.length > 0 ? (
              filtered.map((order) => {
                const payment = getPaymentInfo(order);
                const orderAmount = getOrderAmountForCustomer(order, amountsByPhone);
                return (
                  <Pressable
                    key={order.id}
                    style={[styles.tableRow, selectedOrderId === order.id && styles.tableRowActive]}
                    onPress={() => setSelectedOrderId(order.id)}
                  >
                    <View style={c.id}>
                      <Text style={[styles.td, styles.idText]} numberOfLines={1}>
                        {formatOrderDisplayId(order.id)}
                      </Text>
                    </View>
                    <View style={c.date}>
                      <Text style={styles.td} numberOfLines={1}>
                        {formatOrderDateTimeLabel(order)}
                      </Text>
                    </View>
                    <View style={[c.customer, styles.personCell]}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initials(order.customerName)}</Text>
                      </View>
                      <Text style={[styles.td, styles.personText]} numberOfLines={1}>
                        {formatCustomerName(order.customerName)}
                      </Text>
                    </View>
                    <View style={[c.phone, styles.phoneCell]}>
                      <Ionicons name="call" size={12} color={colors.orange} />
                      <Text style={[styles.td, styles.personText]} numberOfLines={1}>
                        {order.customerPhone}
                      </Text>
                    </View>
                    <View style={c.location}>
                      <Text style={styles.td} numberOfLines={1}>
                        {order.pickupAddress}
                      </Text>
                    </View>
                    <View style={c.location}>
                      <Text style={styles.td} numberOfLines={1}>
                        {order.school || order.dropAddress}
                      </Text>
                    </View>
                    <View style={[c.driver, styles.personCell]}>
                      {order.driver ? (
                        <>
                          <View style={[styles.avatar, styles.driverAvatar]}>
                            <Text style={styles.driverAvatarText}>
                              {order.driver.initials || initials(order.driver.name)}
                            </Text>
                          </View>
                          <Text style={[styles.td, styles.personText]} numberOfLines={1}>
                            {order.driver.name}
                          </Text>
                        </>
                      ) : (
                        <Pressable
                          style={styles.unassignedCell}
                          onPress={() => {
                            if (!drivers.length) {
                              Alert.alert('No drivers', 'Add a driver before assigning orders.');
                              return;
                            }
                            Alert.alert(
                              'Assign Driver',
                              `Assign a driver to order ${order.id}`,
                              [
                                ...drivers.slice(0, 5).map((driver) => ({
                                  text: driver.name,
                                  onPress: async () => {
                                    await assignDriverByAdmin(order.id, driver.id);
                                    await refresh();
                                  },
                                })),
                                { text: 'Cancel', style: 'cancel' },
                              ],
                            );
                          }}
                        >
                          <Text style={[styles.mutedTd, styles.linkTd]} numberOfLines={1}>
                            Assign driver
                          </Text>
                        </Pressable>
                      )}
                    </View>
                    <View style={c.status}>
                      <Badge label={getTableStatusLabel(order.status)} tone={getTableStatusTone(order.status)} />
                    </View>
                    <View style={c.payment}>
                      <Badge label={payment.label} tone={payment.tone} />
                    </View>
                    <View style={c.amount}>
                      <Text style={[styles.td, styles.amountText]} numberOfLines={1}>
                        ₹{orderAmount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No orders match your filters.</Text>
              </View>
            )}
          </View>
        </View>
        </AdminTableScroll>
      </View>

      <AdminMobileOverlay visible={!!customerDetail} onClose={() => setSelectedOrderId(null)}>
        {customerDetail ? (
          <AdminCustomerDetailPanel customer={customerDetail} onClose={() => setSelectedOrderId(null)} />
        ) : null}
      </AdminMobileOverlay>
      </View>
    </AdminPageLayout>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: spacing.lg },
  filtersCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  filtersCardMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 12,
    marginBottom: spacing.lg,
  },
  toolbarFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  toolbarFiltersMobile: {
    width: '100%',
    flexDirection: 'row',
    flex: 0,
    gap: 10,
    alignItems: 'flex-start',
  },
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
  tableWrap: { width: '100%' },
  table: { width: '100%', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: 8,
  },
  tableRowActive: { backgroundColor: colors.orangeLight },
  th: { fontSize: 10, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  td: { fontSize: 12, color: colors.text, fontWeight: '600' },
  mutedTd: { fontSize: 12, color: colors.muted, fontStyle: 'italic' },
  linkTd: { color: colors.orange, fontWeight: '700', fontStyle: 'normal' },
  idText: { fontWeight: '800', color: colors.text },
  amountText: { fontWeight: '800', textAlign: 'right' },
  personCell: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  personText: { flex: 1, minWidth: 0 },
  phoneCell: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
  unassignedCell: { flex: 1, minWidth: 0 },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 10, fontWeight: '800', color: colors.orange },
  driverAvatar: { backgroundColor: colors.greenLight },
  driverAvatarText: { fontSize: 9, fontWeight: '800', color: colors.greenDark },
  emptyRow: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.muted, fontWeight: '600' },
});
