import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { AdminAddDriverModal } from '../../components/admin/AdminAddDriverModal';
import { AdminDriverDetailPanel } from '../../components/admin/AdminDriverDetailPanel';
import { AdminFilterSelect } from '../../components/admin/AdminFilterSelect';
import { AdminKpiCard } from '../../components/admin/AdminKpiCard';
import { AdminKpiRow } from '../../components/admin/AdminKpiRow';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { Badge } from '../../components/Badge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { listAllOrdersToday, subscribeToAllOrdersToday } from '../../services/orderHubService';
import { loadRegisteredDrivers } from '../../services/userRegistryService';
import { DeliveryOrder } from '../../types/delivery';
import {
  DriverUiStatus,
  buildDriverRows,
  countDriversByTab,
  filterDriverRows,
  formatDriverName,
  formatVehicleParts,
  getStatusTone,
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
  const { showMobileHeader, pageTitleSize } = useAdminLayout();

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

  return (
    <AdminPageLayout wide>
      <AdminAddDriverModal
        visible={addDriverOpen}
        onClose={() => setAddDriverOpen(false)}
        onAdded={refresh}
      />
      <View style={styles.header}>
        <View>
          {!showMobileHeader ? <Text style={[styles.pageTitle, { fontSize: pageTitleSize }]}>Drivers</Text> : null}
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.addBtn} onPress={() => setAddDriverOpen(true)}>
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

      <View style={styles.toolbar}>
        <View style={styles.toolbarSearch}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput placeholder="Search Driver" placeholderTextColor={colors.muted} style={styles.toolbarSearchInput} value={query} onChangeText={setQuery} />
        </View>
        <AdminFilterSelect value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} minWidth={130} />
        <AdminFilterSelect value={vehicleFilter} options={VEHICLE_OPTIONS} onChange={setVehicleFilter} minWidth={120} />
        <AdminFilterSelect
          value={dutyFilter}
          options={DUTY_OPTIONS}
          onChange={(value) => setDutyFilter(value as 'all' | 'yes' | 'no')}
          minWidth={110}
        />
      </View>

      <View style={styles.contentRow}>
        <View style={styles.tableCard}>
          {loading ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>Loading drivers…</Text>
            </View>
          ) : (
            <View style={styles.tableWrap}>
              <View style={styles.table}>
                <View style={styles.tableHead}>
                  <View style={styles.colId}>
                    <Text style={styles.th}>Driver ID</Text>
                  </View>
                  <View style={styles.colName}>
                    <Text style={styles.th}>Driver Name</Text>
                  </View>
                  <View style={styles.colPhone}>
                    <Text style={styles.th}>Phone</Text>
                  </View>
                  <View style={styles.colVehicle}>
                    <Text style={styles.th}>Vehicle</Text>
                  </View>
                  <View style={styles.colOrders}>
                    <Text style={[styles.th, styles.thCenter]}>Orders Today</Text>
                  </View>
                  <View style={styles.colEarnings}>
                    <Text style={[styles.th, styles.thCenter]}>Earnings Today</Text>
                  </View>
                  <View style={styles.colStatus}>
                    <Text style={styles.th}>Status</Text>
                  </View>
                </View>

                {filtered.length > 0 ? (
                  filtered.map((driver) => {
                    const vehicle = formatVehicleParts(driver.vehicle);
                    const displayName = formatDriverName(driver.name);
                    return (
                      <Pressable
                        key={driver.id}
                        style={[styles.tableRow, selectedId === driver.id && styles.tableRowActive]}
                        onPress={() => setSelectedId(driver.id)}
                      >
                        <View style={styles.colId}>
                          <Text style={[styles.td, styles.idText]} numberOfLines={1}>
                            {driver.displayId}
                          </Text>
                        </View>
                        <View style={[styles.colName, styles.personCell]}>
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials(displayName)}</Text>
                          </View>
                          <Text style={[styles.td, styles.personText]} numberOfLines={1}>
                            {displayName}
                          </Text>
                        </View>
                        <View style={styles.colPhone}>
                          <Text style={styles.td} numberOfLines={1}>
                            +91 {driver.phone}
                          </Text>
                        </View>
                        <View style={styles.colVehicle}>
                          <Text style={styles.td} numberOfLines={1}>
                            {vehicle.plate}
                          </Text>
                          {vehicle.model ? (
                            <Text style={styles.vehicleModel} numberOfLines={1}>
                              {vehicle.model}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.colOrders}>
                          <Text style={[styles.td, styles.numericText]}>{driver.ordersToday}</Text>
                        </View>
                        <View style={styles.colEarnings}>
                          <Text style={[styles.td, styles.numericText, styles.earningsText]} numberOfLines={1}>
                            ₹{driver.earningsToday.toLocaleString('en-IN')}
                          </Text>
                        </View>
                        <View style={styles.colStatus}>
                          <Badge label={driver.uiStatus} tone={getStatusTone(driver.uiStatus)} />
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
            </View>
          )}
        </View>

        {selected ? (
          <AdminDriverDetailPanel
            driver={selected}
            onMarkLeave={() => handleMarkLeave(selected.id)}
            onClose={() => setSelectedId(null)}
            onApprovalChanged={refresh}
          />
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
  breadcrumb: { fontSize: 13, color: colors.muted, marginTop: 4, fontWeight: '600' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
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
    minWidth: 160,
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
  colId: { flex: 0.9, minWidth: 0 },
  colName: { flex: 1.2, minWidth: 0 },
  colPhone: { flex: 1, minWidth: 0 },
  colVehicle: { flex: 1.15, minWidth: 0 },
  colOrders: { width: 72, flexShrink: 0, alignItems: 'center' },
  colEarnings: { width: 88, flexShrink: 0, alignItems: 'center' },
  colStatus: { width: 108, flexShrink: 0, alignItems: 'flex-start' },
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
  emptyRow: { paddingVertical: 48, alignItems: 'center', paddingHorizontal: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 6 },
  emptyText: { fontSize: 13, color: colors.muted, fontWeight: '600', textAlign: 'center' },
});
