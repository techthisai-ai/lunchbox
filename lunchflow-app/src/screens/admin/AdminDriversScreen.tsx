import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { AdminTableScroll } from '../../components/admin/AdminTableScroll';
import { AdminAddDriverModal } from '../../components/admin/AdminAddDriverModal';
import { AdminDriverApprovalModal } from '../../components/admin/AdminDriverApprovalModal';
import { AdminDriverDetailPanel } from '../../components/admin/AdminDriverDetailPanel';
import { AdminMobileOverlay } from '../../components/admin/AdminMobileOverlay';
import { AdminSearchField } from '../../components/admin/AdminSearchField';
import { AdminFilterSelect } from '../../components/admin/AdminFilterSelect';
import { AdminKpiCard } from '../../components/admin/AdminKpiCard';
import { AdminKpiRow } from '../../components/admin/AdminKpiRow';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { Badge } from '../../components/Badge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { useAdminTableColumn } from '../../hooks/useAdminTableColumn';
import { listAllOrdersToday, subscribeToAllOrdersToday } from '../../services/orderHubService';
import { loadRegisteredDrivers, setDriverAvailability } from '../../services/userRegistryService';
import { DeliveryOrder } from '../../types/delivery';
import {
  DriverUiStatus,
  buildDriverRows,
  countDriversByTab,
  filterDriverRows,
  formatDriverName,
  formatVehicleParts,
  getStatusTone,
  isDriverAccountActive,
} from '../../utils/adminDriverHelpers';

const STATUS_OPTIONS: { id: 'all' | DriverUiStatus; label: string }[] = [
  { id: 'all', label: 'All Status' },
  { id: 'Pending Approval', label: 'Pending Approval' },
  { id: 'On Duty', label: 'On Duty' },
  { id: 'Available', label: 'Available' },
  { id: 'On Leave', label: 'On Leave' },
  { id: 'Inactive', label: 'Inactive' },
];

const VEHICLE_OPTIONS = [
  { id: 'all', label: 'All Types' },
  { id: 'Bike', label: 'Bike' },
  { id: 'Car', label: 'Car' },
  { id: 'Auto', label: 'Auto' },
];

const DUTY_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'yes', label: 'On Duty' },
  { id: 'no', label: 'Off Duty' },
];

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function AdminDriversScreen() {
  const [drivers, setDrivers] = useState<Awaited<ReturnType<typeof loadRegisteredDrivers>>>([]);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [onLeaveIds, setOnLeaveIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DriverUiStatus>('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [dutyFilter, setDutyFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const { showMobileHeader, pageTitleSize, isSidebarCollapsed } = useAdminLayout();
  const col = useAdminTableColumn();
  const c = {
    id: col(0.9, 90),
    name: col(1.2, 165),
    phone: col(1, 115),
    vehicle: col(1.15, 125),
    orders: col(0.65, 75, { alignItems: 'center' }),
    earnings: col(0.85, 95, { alignItems: 'center' }),
    status: col(1, 115, { alignItems: 'flex-start' }),
    action: col(0.75, 88, { alignItems: 'center', justifyContent: 'center' }),
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [driverList, orderList] = await Promise.all([loadRegisteredDrivers(), listAllOrdersToday()]);
      setDrivers(driverList);
      setOrders(orderList);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => subscribeToAllOrdersToday(setOrders), []);

  const rows = useMemo(() => buildDriverRows(drivers, orders, onLeaveIds), [drivers, orders, onLeaveIds]);
  const tabCounts = useMemo(() => countDriversByTab(rows), [rows]);

  const activeCount = rows.filter((r) => r.uiStatus !== 'Inactive').length;
  const onDutyCount = tabCounts.on_duty;
  const onLeaveCount = tabCounts.on_leave;
  const pendingCount = tabCounts.pending_approval;

  const filtered = useMemo(
    () => filterDriverRows(rows, { tab: 'all', query, statusFilter, vehicleFilter, dutyFilter }),
    [rows, query, statusFilter, vehicleFilter, dutyFilter],
  );

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const handleMarkLeave = (driverId: string) => {
    setOnLeaveIds((prev) => {
      const next = new Set(prev);
      if (next.has(driverId)) next.delete(driverId);
      else next.add(driverId);
      return next;
    });
  };

  const handleSetAvailability = async (driverId: string, active: boolean) => {
    try {
      await setDriverAvailability(driverId, active);
      await refresh();
    } catch (error) {
      Alert.alert('Unable to update', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <AdminPageLayout wide>
      <AdminAddDriverModal
        visible={addDriverOpen}
        onClose={() => setAddDriverOpen(false)}
        onAdded={refresh}
      />
      <AdminDriverApprovalModal
        visible={approvalOpen}
        onClose={() => setApprovalOpen(false)}
        onChanged={refresh}
      />
      <View style={[styles.header, isSidebarCollapsed && styles.headerCompact]}>
        <View>
          {!showMobileHeader ? <Text style={[styles.pageTitle, { fontSize: pageTitleSize }]}>Drivers</Text> : null}
        </View>
        <View style={[styles.headerActions, isSidebarCollapsed && styles.headerActionsFull]}>
          <Pressable
            style={[styles.approvalBtn, isSidebarCollapsed && styles.actionBtnFlex]}
            onPress={() => setApprovalOpen(true)}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.orange} />
            <Text style={styles.approvalBtnText}>Approval</Text>
            {pendingCount > 0 ? (
              <View style={styles.approvalBadge}>
                <Text style={styles.approvalBadgeText}>{pendingCount}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            style={[styles.addBtn, isSidebarCollapsed && styles.actionBtnFlex]}
            onPress={() => setAddDriverOpen(true)}
          >
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={styles.addBtnText}>Add Driver</Text>
          </Pressable>
        </View>
      </View>

      <AdminKpiRow dense>
        <AdminKpiCard compact label="Total Drivers" value={String(rows.length)} icon="people" iconBg={colors.purpleLight} iconColor={colors.purple} />
        <AdminKpiCard compact label="Active Drivers" value={String(activeCount)} icon="person-circle" iconBg={colors.greenLight} iconColor={colors.greenDark} />
        <AdminKpiCard compact label="On Duty" value={String(onDutyCount)} icon="bicycle" iconBg={colors.blueLight} iconColor={colors.blue} />
        <AdminKpiCard compact label="On Leave" value={String(onLeaveCount)} icon="time" iconBg={colors.yellowLight} iconColor={colors.dark} />
        <AdminKpiCard compact label="Pending Approval" value={String(pendingCount)} icon="time" iconBg={colors.orangeLight} iconColor={colors.orange} />
        <AdminKpiCard compact label="Inactive Drivers" value={String(tabCounts.inactive)} icon="person-remove" iconBg={colors.redLight} iconColor={colors.red} />
      </AdminKpiRow>

      <View style={[styles.toolbar, isSidebarCollapsed && styles.toolbarMobile]}>
        <AdminSearchField placeholder="Search Driver" value={query} onChangeText={setQuery} fullWidth={isSidebarCollapsed} />
        <View style={[styles.toolbarFilters, isSidebarCollapsed && styles.toolbarFiltersMobile]}>
          <AdminFilterSelect value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} minWidth={130} fullWidth={isSidebarCollapsed} />
          <AdminFilterSelect value={vehicleFilter} options={VEHICLE_OPTIONS} onChange={setVehicleFilter} minWidth={120} fullWidth={isSidebarCollapsed} />
          <AdminFilterSelect
            value={dutyFilter}
            options={DUTY_OPTIONS}
            onChange={(value) => setDutyFilter(value as 'all' | 'yes' | 'no')}
            minWidth={110}
            fullWidth={isSidebarCollapsed}
          />
        </View>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.tableCard}>
          {loading ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>Loading drivers…</Text>
            </View>
          ) : (
            <View style={styles.tableWrap}>
              <AdminTableScroll minWidth={960}>
              <View style={styles.table}>
                <View style={styles.tableHead}>
                  <View style={c.id}><Text style={styles.th}>Driver ID</Text></View>
                  <View style={c.name}><Text style={styles.th}>Driver Name</Text></View>
                  <View style={c.phone}><Text style={styles.th}>Phone</Text></View>
                  <View style={c.vehicle}><Text style={styles.th}>Vehicle</Text></View>
                  <View style={c.orders}><Text style={[styles.th, styles.thCenter]}>Orders Today</Text></View>
                  <View style={c.earnings}><Text style={[styles.th, styles.thCenter]}>Earnings Today</Text></View>
                  <View style={c.status}><Text style={styles.th}>Status</Text></View>
                  <View style={c.action}><Text style={[styles.th, styles.thCenter]}>Action</Text></View>
                </View>

                {filtered.length > 0 ? (
                  filtered.map((driver) => {
                    const vehicle = formatVehicleParts(driver.vehicle);
                    const displayName = formatDriverName(driver.name);
                    const accountActive = isDriverAccountActive(driver);
                    const canToggle = driver.approvalStatus === 'approved';
                    return (
                      <Pressable
                        key={driver.id}
                        style={[styles.tableRow, selectedId === driver.id && styles.tableRowActive]}
                        onPress={() => setSelectedId(driver.id)}
                      >
                        <View style={c.id}>
                          <Text style={[styles.td, styles.idText]} numberOfLines={1}>
                            {driver.displayId}
                          </Text>
                        </View>
                        <View style={[c.name, styles.personCell]}>
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials(displayName)}</Text>
                          </View>
                          <Text style={[styles.td, styles.personText]} numberOfLines={1}>
                            {displayName}
                          </Text>
                        </View>
                        <View style={c.phone}>
                          <Text style={styles.td} numberOfLines={1}>
                            +91 {driver.phone}
                          </Text>
                        </View>
                        <View style={c.vehicle}>
                          <Text style={styles.td} numberOfLines={1}>
                            {vehicle.plate}
                          </Text>
                          {vehicle.model ? (
                            <Text style={styles.vehicleModel} numberOfLines={1}>
                              {vehicle.model}
                            </Text>
                          ) : null}
                        </View>
                        <View style={c.orders}>
                          <Text style={[styles.td, styles.numericText]}>{driver.ordersToday}</Text>
                        </View>
                        <View style={c.earnings}>
                          <Text style={[styles.td, styles.numericText, styles.earningsText]} numberOfLines={1}>
                            ₹{driver.earningsToday.toLocaleString('en-IN')}
                          </Text>
                        </View>
                        <View style={c.status}>
                          <Badge label={driver.uiStatus} tone={getStatusTone(driver.uiStatus)} />
                        </View>
                        <View style={c.action}>
                          <View style={styles.actionGroup}>
                            <Pressable
                              style={[styles.actionBtn, accountActive && styles.actionBtnActive]}
                              onPress={(event) => {
                                event.stopPropagation?.();
                                if (canToggle && !accountActive) void handleSetAvailability(driver.id, true);
                              }}
                              disabled={!canToggle || accountActive}
                            >
                              <Ionicons
                                name="checkmark-circle"
                                size={22}
                                color={accountActive ? colors.green : colors.muted}
                              />
                            </Pressable>
                            <Pressable
                              style={[styles.actionBtn, !accountActive && canToggle && styles.actionBtnInactive]}
                              onPress={(event) => {
                                event.stopPropagation?.();
                                if (canToggle && accountActive) void handleSetAvailability(driver.id, false);
                              }}
                              disabled={!canToggle || !accountActive}
                            >
                              <Ionicons
                                name="close-circle"
                                size={22}
                                color={!accountActive && canToggle ? colors.red : colors.muted}
                              />
                            </Pressable>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyTitle}>No drivers yet</Text>
                    <Text style={styles.emptyText}>Drivers appear here after they register and log in.</Text>
                  </View>
                )}
              </View>
              </AdminTableScroll>
            </View>
          )}
        </View>

        <AdminMobileOverlay visible={!!selected} onClose={() => setSelectedId(null)}>
          {selected ? (
            <AdminDriverDetailPanel
              driver={selected}
              onMarkLeave={() => handleMarkLeave(selected.id)}
              onClose={() => setSelectedId(null)}
              onApprovalChanged={refresh}
            />
          ) : null}
        </AdminMobileOverlay>
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
  headerCompact: { flexDirection: 'column', alignItems: 'stretch' },
  headerActionsFull: { width: '100%' },
  actionBtnFlex: { flex: 1, justifyContent: 'center' },
  approvalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    height: 40,
    borderWidth: 1.5,
    borderColor: colors.orange,
  },
  approvalBtnText: { fontSize: 13, fontWeight: '800', color: colors.orange },
  approvalBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  approvalBadgeText: { fontSize: 10, fontWeight: '800', color: colors.onPrimary },
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
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: spacing.lg },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  toolbarMobile: { flexDirection: 'column', alignItems: 'stretch' },
  toolbarFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  toolbarFiltersMobile: { width: '100%', flexDirection: 'column', flex: 0 },
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
  tableWrap: { width: '100%', paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  table: { width: '100%' },
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
  thCenter: { textAlign: 'center', width: '100%' },
  td: { fontSize: 12, color: colors.text, fontWeight: '600' },
  personText: { flex: 1, minWidth: 0 },
  idText: { fontWeight: '800', color: colors.text },
  earningsText: { fontWeight: '800', color: colors.text },
  numericText: { textAlign: 'center', width: '100%' },
  vehicleModel: { fontSize: 10, color: colors.muted, marginTop: 1, fontWeight: '600' },
  personCell: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 10, fontWeight: '800', color: colors.greenDark },
  actionGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  actionBtnActive: { backgroundColor: colors.greenLight },
  actionBtnInactive: { backgroundColor: colors.redLight },
  emptyRow: { paddingVertical: 48, alignItems: 'center', paddingHorizontal: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 },
  emptyText: { fontSize: 13, color: colors.muted, fontWeight: '600', textAlign: 'center' },
});
