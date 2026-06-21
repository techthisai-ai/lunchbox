import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AdminAddDriverModal } from '../../components/admin/AdminAddDriverModal';
import { AdminDriverDetailPanel } from '../../components/admin/AdminDriverDetailPanel';
import { AdminFilterSelect } from '../../components/admin/AdminFilterSelect';
import { AdminKpiCard } from '../../components/admin/AdminKpiCard';
import { AdminKpiRow } from '../../components/admin/AdminKpiRow';
import { AdminNotificationBell } from '../../components/admin/AdminNotificationBell';
import { AdminPageLayout } from '../../components/admin/AdminPageLayout';
import { AdminTableScroll } from '../../components/admin/AdminTableScroll';
import { Badge } from '../../components/Badge';
import { colors, radius, spacing } from '../../constants/theme';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { listAllOrdersToday, subscribeToAllOrdersToday } from '../../services/orderHubService';
import { loadRegisteredDrivers } from '../../services/userRegistryService';
import { DeliveryOrder } from '../../types/delivery';
import {
  DriverTab,
  DriverUiStatus,
  buildDriverRows,
  countDriversByTab,
  filterDriverRows,
  formatDriverName,
  formatVehicleParts,
  getStatusTone,
} from '../../utils/adminDriverHelpers';

const PAGE_SIZE = 8;

const TABS: { id: DriverTab; label: string }[] = [
  { id: 'all', label: 'All Drivers' },
  { id: 'on_duty', label: 'On Duty' },
  { id: 'on_leave', label: 'On Leave' },
  { id: 'inactive', label: 'Inactive' },
];

const STATUS_OPTIONS: { id: 'all' | DriverUiStatus; label: string }[] = [
  { id: 'all', label: 'All Status' },
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

function formatTodayDate(): string {
  return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

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
  const [tab, setTab] = useState<DriverTab>('all');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DriverUiStatus>('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [dutyFilter, setDutyFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [page, setPage] = useState(1);
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

  useEffect(() => {
    setPage(1);
  }, [tab, query, statusFilter, vehicleFilter, dutyFilter]);

  const rows = useMemo(() => buildDriverRows(drivers, orders, onLeaveIds), [drivers, orders, onLeaveIds]);
  const tabCounts = useMemo(() => countDriversByTab(rows), [rows]);

  const activeCount = rows.filter((r) => r.uiStatus !== 'Inactive').length;
  const onDutyCount = tabCounts.on_duty;
  const onLeaveCount = tabCounts.on_leave;
  const inactiveCount = tabCounts.inactive;

  const filtered = useMemo(
    () => filterDriverRows(rows, { tab, query, statusFilter, vehicleFilter, dutyFilter }),
    [rows, tab, query, statusFilter, vehicleFilter, dutyFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const max = Math.min(totalPages, 4);
    for (let i = 1; i <= max; i += 1) pages.push(i);
    return pages;
  }, [totalPages]);

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
          <View style={styles.datePill}>
            <Ionicons name="calendar-outline" size={16} color={colors.muted} />
            <Text style={styles.dateText}>{formatTodayDate()}</Text>
          </View>
          <AdminNotificationBell />
          <Pressable style={styles.addBtn} onPress={() => setAddDriverOpen(true)}>
            <Ionicons name="add" size={18} color={colors.white} />
            <Text style={styles.addBtnText}>Add Driver</Text>
          </Pressable>
        </View>
      </View>

      <AdminKpiRow>
        <AdminKpiCard label="Total Drivers" value={String(rows.length)} icon="people" iconBg={colors.purpleLight} iconColor={colors.purple} />
        <AdminKpiCard label="Active Drivers" value={String(activeCount)} icon="person-circle" iconBg={colors.greenLight} iconColor={colors.greenDark} />
        <AdminKpiCard label="On Duty" value={String(onDutyCount)} icon="bicycle" iconBg={colors.blueLight} iconColor={colors.blue} />
        <AdminKpiCard label="On Leave" value={String(onLeaveCount)} icon="time" iconBg={colors.yellowLight} iconColor={colors.dark} />
        <AdminKpiCard label="Inactive Drivers" value={String(inactiveCount)} icon="person-remove" iconBg={colors.redLight} iconColor={colors.red} />
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
        <View style={styles.joinedPill}>
          <Ionicons name="calendar-outline" size={14} color={colors.muted} />
          <Text style={styles.joinedText}>Joined Date</Text>
        </View>
        <Pressable style={styles.filterBtn}>
          <Ionicons name="options-outline" size={16} color={colors.text} />
          <Text style={styles.filterBtnText}>Filters</Text>
        </Pressable>
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
          </View>

          {loading ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>Loading drivers…</Text>
            </View>
          ) : (
            <View style={styles.tableWrap}>
              <AdminTableScroll minWidth={900}>
                <View style={styles.table}>
                <View style={styles.tableHead}>
                  <Text style={[styles.th, styles.colId]}>Driver ID</Text>
                  <Text style={[styles.th, styles.colName]}>Driver Name</Text>
                  <Text style={[styles.th, styles.colPhone]}>Phone</Text>
                  <Text style={[styles.th, styles.colVehicle]}>Vehicle</Text>
                  <Text style={[styles.th, styles.colOrders, styles.thCenter]}>Orders Today</Text>
                  <Text style={[styles.th, styles.colEarnings, styles.thCenter]}>Earnings Today</Text>
                  <Text style={[styles.th, styles.colStatus]}>Status</Text>
                </View>

                {pageRows.length > 0 ? (
                  pageRows.map((driver) => {
                    const vehicle = formatVehicleParts(driver.vehicle);
                    const displayName = formatDriverName(driver.name);
                    return (
                      <Pressable
                        key={driver.id}
                        style={[styles.tableRow, selectedId === driver.id && styles.tableRowActive]}
                        onPress={() => setSelectedId(driver.id)}
                      >
                        <Text style={[styles.td, styles.colId, styles.idText]} numberOfLines={1}>
                          {driver.displayId}
                        </Text>
                        <View style={[styles.colName, styles.personCell]}>
                          <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{initials(displayName)}</Text>
                          </View>
                          <Text style={[styles.td, styles.nameText]} numberOfLines={1}>
                            {displayName}
                          </Text>
                        </View>
                        <Text style={[styles.td, styles.colPhone]} numberOfLines={1}>
                          +91 {driver.phone}
                        </Text>
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
                        <Text style={[styles.td, styles.colOrders, styles.numericText]}>{driver.ordersToday}</Text>
                        <Text style={[styles.td, styles.colEarnings, styles.numericText, styles.earningsText]}>
                          ₹{driver.earningsToday.toLocaleString('en-IN')}
                        </Text>
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
              </AdminTableScroll>
            </View>
          )}

          <View style={styles.pagination}>
            <Text style={styles.pageInfo}>
              Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} drivers
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

        {selected ? (
          <AdminDriverDetailPanel
            driver={selected}
            onMarkLeave={() => handleMarkLeave(selected.id)}
            onClose={() => setSelectedId(null)}
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
  joinedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    height: 40,
  },
  joinedText: { fontSize: 13, color: colors.muted, fontWeight: '600' },
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
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
  tableWrap: { width: '100%', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
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
  thCenter: { textAlign: 'center' },
  td: { fontSize: 13, color: colors.text, fontWeight: '600' },
  nameText: { flex: 1, minWidth: 0 },
  idText: { fontWeight: '800', color: colors.text },
  earningsText: { fontWeight: '800', color: colors.text },
  numericText: { textAlign: 'center' },
  vehicleModel: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: '600' },
  colId: { width: 88, flexShrink: 0 },
  colName: { flex: 1.4, minWidth: 140 },
  colPhone: { flex: 1.1, minWidth: 118 },
  colVehicle: { flex: 1.5, minWidth: 150 },
  colOrders: { width: 92, flexShrink: 0 },
  colEarnings: { width: 108, flexShrink: 0 },
  colStatus: { width: 100, flexShrink: 0, justifyContent: 'center' },
  personCell: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 11, fontWeight: '800', color: colors.greenDark },
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
