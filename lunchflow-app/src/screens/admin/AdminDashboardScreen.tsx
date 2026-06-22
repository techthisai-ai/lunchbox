import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AdminKpiCard } from '../../components/admin/AdminKpiCard';
import { AdminKpiRow } from '../../components/admin/AdminKpiRow';
import { AdminNotificationBell } from '../../components/admin/AdminNotificationBell';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { AdminPanel } from '../../components/admin/AdminPanel';
import { Badge } from '../../components/Badge';
import { formatOrderDisplayId } from '../../utils/adminOrderHelpers';
import { LiveDeliveryMap } from '../../components/LiveDeliveryMap';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { buildDailySalesReport, buildSalaryReport } from '../../services/reportsService';
import {
  getAdminStatusLabel,
  listActiveFleetOrders,
  listAllOrdersToday,
  processExpiredPickupOrders,
  subscribeToAllOrdersToday,
} from '../../services/orderHubService';
import { loadRegisteredDrivers } from '../../services/userRegistryService';
import { DeliveryOrder, DeliveryStatus } from '../../types/delivery';

function formatTodayDate(): string {
  return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusTone(status: DeliveryStatus): 'green' | 'orange' | 'blue' | 'gray' {
  if (status === 'delivered') return 'green';
  if (status === 'booked' || status === 'pickup_closed') return 'gray';
  if (status === 'in_transit' || status === 'picked_up' || status === 'at_drop') return 'blue';
  return 'orange';
}

function pickMapOrder(orders: DeliveryOrder[]): DeliveryOrder | null {
  return (
    orders.find((o) => o.status === 'in_transit' || o.status === 'picked_up') ??
    orders.find((o) => o.driver) ??
    orders[0] ??
    null
  );
}

export function AdminDashboardScreen() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [drivers, setDrivers] = useState<Awaited<ReturnType<typeof loadRegisteredDrivers>>>([]);
  const [revenue, setRevenue] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);
  const { showMobileHeader, pageTitleSize } = useAdminLayout();

  const refresh = useCallback(async () => {
    await processExpiredPickupOrders();
    const [todayOrders, daily, salaryReport, driverList] = await Promise.all([
      listAllOrdersToday(),
      buildDailySalesReport(),
      buildSalaryReport(),
      loadRegisteredDrivers(),
    ]);
    setOrders(todayOrders);
    setRevenue(daily.revenue);
    setPendingPayments(salaryReport.unpaid);
    setDrivers(driverList);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const interval = setInterval(refresh, 5000);
      return () => clearInterval(interval);
    }, [refresh]),
  );

  useEffect(() => subscribeToAllOrdersToday(setOrders), []);

  const today = new Date().toISOString().slice(0, 10);
  const deliveredToday = orders.filter((o) => o.status === 'delivered' && (o.date === today || o.date.startsWith(today)));
  const totalDeliveries = orders.filter((o) => o.status === 'delivered');
  const activeDrivers = drivers.filter((d) => d.status === 'On Route' || d.status === 'Available');
  const availableDrivers = drivers.filter((d) => d.status === 'Available');
  const mapOrder = pickMapOrder(orders);
  const fleetOrders = listActiveFleetOrders(orders);

  const recentOrders = orders.slice(0, 5);

  return (
    <AdminPageLayout wide>
      <View style={styles.header}>
        {!showMobileHeader ? (
          <View>
            <Text style={[styles.pageTitle, { fontSize: pageTitleSize }]}>Dashboard</Text>
          </View>
        ) : (
          <View />
        )}
        <View style={styles.headerActions}>
          <View style={styles.datePill}>
            <Ionicons name="calendar-outline" size={16} color={colors.muted} />
            <Text style={styles.dateText}>{formatTodayDate()}</Text>
          </View>
          <AdminNotificationBell />
        </View>
      </View>

      <AdminKpiRow dense>
        <AdminKpiCard compact label="Today's Deliveries" value={String(deliveredToday.length)} icon="cube" iconBg={colors.purpleLight} iconColor={colors.purple} />
        <AdminKpiCard compact label="Active Drivers" value={String(activeDrivers.length)} icon="people" iconBg={colors.greenLight} iconColor={colors.greenDark} />
        <AdminKpiCard compact label="Available Drivers" value={String(availableDrivers.length)} icon="bicycle" iconBg={colors.blueLight} iconColor={colors.blue} />
        <AdminKpiCard compact label="Total Deliveries" value={String(totalDeliveries.length)} icon="checkmark-done" iconBg={colors.greenLight} iconColor={colors.greenDark} />
        <AdminKpiCard compact label="Revenue Today" value={`₹${revenue.toLocaleString('en-IN')}`} icon="wallet" iconBg={colors.purpleLight} iconColor={colors.purple} />
        <AdminKpiCard compact label="Pending Payments" value={`₹${pendingPayments.toLocaleString('en-IN')}`} icon="card" iconBg={colors.yellowLight} iconColor={colors.dark} />
      </AdminKpiRow>

      <View style={styles.midRow}>
        <AdminPanel title="Live Delivery Map" style={styles.mapPanel}>
          {(mapOrder ?? fleetOrders[0] ?? orders[0]) ? (
            <LiveDeliveryMap order={(mapOrder ?? fleetOrders[0] ?? orders[0])!} fleetOrders={fleetOrders} height={280} />
          ) : (
            <View style={styles.mapPlaceholder}>
              <Ionicons name="map-outline" size={32} color={colors.muted} />
              <Text style={styles.placeholderText}>No active deliveries on the map yet.</Text>
            </View>
          )}
        </AdminPanel>
      </View>

      <View style={styles.bottomRow}>
        <AdminPanel title="Recent Orders" actionLabel="View all" style={styles.tablePanel}>
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <View style={styles.colId}>
                <Text style={styles.th}>Order ID</Text>
              </View>
              <View style={styles.colCustomer}>
                <Text style={styles.th}>Customer</Text>
              </View>
              <View style={styles.colRoute}>
                <Text style={styles.th}>Route</Text>
              </View>
              <View style={styles.colDriver}>
                <Text style={styles.th}>Driver</Text>
              </View>
              <View style={styles.colStatus}>
                <Text style={styles.th}>Status</Text>
              </View>
            </View>
            {recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <View key={order.id} style={styles.tableRow}>
                  <View style={styles.colId}>
                    <Text style={[styles.td, styles.idText]} numberOfLines={1}>
                      {formatOrderDisplayId(order.id)}
                    </Text>
                  </View>
                  <View style={styles.colCustomer}>
                    <Text style={styles.td} numberOfLines={1}>
                      {order.customerName}
                    </Text>
                  </View>
                  <View style={styles.colRoute}>
                    <Text style={styles.td} numberOfLines={1}>
                      {order.pickupAddress} → {order.school}
                    </Text>
                  </View>
                  <View style={styles.colDriver}>
                    <Text style={styles.td} numberOfLines={1}>
                      {order.driver?.name ?? '—'}
                    </Text>
                  </View>
                  <View style={styles.colStatus}>
                    <Badge label={getAdminStatusLabel(order.status)} tone={statusTone(order.status)} />
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>No orders today yet.</Text>
            )}
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
  midRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  bottomRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  mapPanel: { flex: 1, minWidth: 0, width: '100%' },
  tablePanel: { flex: 1, minWidth: 0, width: '100%' },
  mapPlaceholder: {
    height: 280,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: { fontSize: 13, color: colors.muted },
  table: { width: '100%' },
  tableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    gap: 12,
  },
  th: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  td: { fontSize: 12, color: colors.text, fontWeight: '500' },
  idText: { fontWeight: '800', color: colors.text },
  colId: { flex: 1.1, minWidth: 0 },
  colCustomer: { flex: 1, minWidth: 0 },
  colRoute: { flex: 1.8, minWidth: 0 },
  colDriver: { flex: 0.9, minWidth: 0 },
  colStatus: { width: 118, flexShrink: 0, alignItems: 'flex-start' },
  empty: { fontSize: 13, color: colors.muted, paddingVertical: 12 },
});
