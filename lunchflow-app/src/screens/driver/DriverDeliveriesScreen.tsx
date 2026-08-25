import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { PickupVerifyDialog } from '../../components/PickupVerifyDialog';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DriverBulkDeliveryCard } from '../../components/driver/DriverBulkDeliveryCard';
import { DriverTripCompletedDialog } from '../../components/driver/DriverTripCompletedDialog';
import { DriverKpiRow } from '../../components/driver/DriverKpiRow';
import { DriverScreenHeader } from '../../components/driver/DriverScreenHeader';
import { DriverOrderAddressDialog } from '../../components/DriverOrderAddressDialog';
import { colors, radius, shadow, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useDriverTrip } from '../../context/DriverTripContext';
import { DriverTabParamList, RootStackParamList } from '../../navigation/types';
import { openDriverRouteMap } from '../../navigation/driverRoutes';
import {
  listDriverActiveOrders,
  listDriverCompletedToday,
  listDriverCancelledToday,
  listPendingPickups,
  markAtDrop,
  markAtPickup,
  markBatchOrdersDelivered,
  markDelivered,
  markPickedUp,
  verifyPickup,
} from '../../services/orderHubService';
import { isNearStop } from '../../services/enfieldMapsService';
import { subscribeToOrderChanges } from '../../services/orderSync';
import { buildSchoolBatches } from '../../services/batchDeliveryService';
import { DeliveryBatch } from '../../types/batch';
import { DeliveryOrder, getDropAddress } from '../../types/delivery';
import { buildDriverDeliveryStops, DriverDeliveryStop } from '../../utils/driverDeliveryStops';
import { buildDriverLocationGroups, buildCompletedLocationGroups, DriverLocationGroup, flattenLocationGroupsToOrders, getLocationGroupKey } from '../../utils/driverLocationGroups';
import { getAssignedDriverOrders } from '../../utils/driverTripNavigation';
import { DRIVER_EARNING_PER_ORDER } from '../../utils/adminDriverHelpers';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<DriverTabParamList, 'DriverDeliveries'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function phaseTone(phase: DriverDeliveryStop['phase']): 'orange' | 'green' | 'blue' | 'gray' {
  if (phase === 'pickup_pending') return 'orange';
  if (phase === 'active') return 'green';
  if (phase === 'pending') return 'blue';
  return 'gray';
}

function phaseLabel(phase: DriverDeliveryStop['phase']): string {
  if (phase === 'pickup_pending') return 'Pickup Pending';
  if (phase === 'active') return 'Active';
  if (phase === 'pending') return 'Pending';
  return 'Delivered';
}

function StopAction({
  label,
  onPress,
  variant = 'outline',
}: {
  label: string;
  onPress: () => void;
  variant?: 'outline' | 'green';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.stopActionBtn,
        variant === 'green' && styles.stopActionBtnGreen,
        pressed && styles.stopActionBtnPressed,
      ]}
    >
      <Text style={[styles.stopActionText, variant === 'green' && styles.stopActionTextGreen]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function DriverDeliveriesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const {
    trip,
    tripActive,
    driverLocation,
    stats,
    activeRoute,
    currentPickupStop,
    currentDeliveryStop,
    refreshTripRoutes,
    resumeTrip,
    startTrip,
    completePickupStop,
    markPickupStopReached,
    markDeliveryStopReached,
    completeDeliveryStop,
    resetTrip,
  } = useDriverTrip();
  const [activeOrders, setActiveOrders] = useState<DeliveryOrder[]>([]);
  const [completed, setCompleted] = useState<DeliveryOrder[]>([]);
  const [cancelled, setCancelled] = useState<DeliveryOrder[]>([]);
  const [pending, setPending] = useState<DeliveryOrder[]>([]);
  const [verifyOrder, setVerifyOrder] = useState<DeliveryOrder | null>(null);
  const [tripPickupVerify, setTripPickupVerify] = useState(false);
  const [showTripCompleted, setShowTripCompleted] = useState(false);
  const [addressOrder, setAddressOrder] = useState<DeliveryOrder | null>(null);
  const [actionError, setActionError] = useState('');
  const [batches, setBatches] = useState<DeliveryBatch[]>([]);
  const [bulkLoadingGroupId, setBulkLoadingGroupId] = useState<string | null>(null);
  const [singleDeliveringId, setSingleDeliveringId] = useState<string | null>(null);
  const [confirmGroup, setConfirmGroup] = useState<DriverLocationGroup | null>(null);
  const [confirmAllSelected, setConfirmAllSelected] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [successGroups, setSuccessGroups] = useState<Record<string, string>>({});
  const [justDeliveredGroup, setJustDeliveredGroup] = useState<DriverLocationGroup | null>(null);
  const deliveringRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const [activeList, done, cancelledList, pendingList] = await Promise.all([
      listDriverActiveOrders(user.id),
      listDriverCompletedToday(user.id),
      listDriverCancelledToday(user.id),
      listPendingPickups(),
    ]);
    setActiveOrders(activeList);
    setCompleted(done);
    setCancelled(cancelledList);
    setPending(pendingList);
    setBatches(await buildSchoolBatches([...activeList, ...done]));
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const interval = setInterval(refresh, 3000);
      return () => clearInterval(interval);
    }, [refresh]),
  );

  useEffect(() => subscribeToOrderChanges(refresh), [refresh]);

  const assignedOrders = useMemo(() => getAssignedDriverOrders(activeOrders), [activeOrders]);

  const handleNavigateToRoute = useCallback(async () => {
    setActionError('');
    try {
      await openDriverRouteMap(navigation, {
        tripActive,
        startTrip,
        resumeTrip,
        refreshTripRoutes,
        assignedOrders,
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not open route map');
    }
  }, [navigation, tripActive, startTrip, resumeTrip, refreshTripRoutes, assignedOrders]);

  useEffect(() => {
    if (trip.phase === 'idle') return undefined;
    const orders = [...assignedOrders, ...completed];
    void refreshTripRoutes(orders);
    if (!tripActive) return undefined;
    const interval = setInterval(() => {
      void refreshTripRoutes([...assignedOrders, ...completed]);
    }, 8000);
    return () => clearInterval(interval);
  }, [trip.phase, tripActive, assignedOrders, completed, refreshTripRoutes]);

  useEffect(() => {
    if (!tripActive || !driverLocation) return;
    if (trip.phase === 'pickup' && currentPickupStop && isNearStop(driverLocation, currentPickupStop.point)) {
      markPickupStopReached(currentPickupStop.id);
      setTripPickupVerify(true);
    }
    if (trip.phase === 'delivery' && currentDeliveryStop && isNearStop(driverLocation, currentDeliveryStop.point)) {
      markDeliveryStopReached(currentDeliveryStop.id);
    }
  }, [
    tripActive,
    trip.phase,
    driverLocation,
    currentPickupStop,
    currentDeliveryStop,
    markPickupStopReached,
    markDeliveryStopReached,
  ]);

  useEffect(() => {
    if (trip.phase === 'completed' && !showTripCompleted) {
      setShowTripCompleted(true);
    }
  }, [trip.phase, showTripCompleted]);

  const pickupPendingCount = activeOrders.filter((o) =>
    ['driver_assigned', 'at_pickup', 'pickup_verified'].includes(o.status),
  ).length;
  const activeCount = activeOrders.filter((o) =>
    ['in_transit', 'at_drop', 'picked_up'].includes(o.status),
  ).length;

  const stops = useMemo(
    () => buildDriverDeliveryStops(pending, activeOrders).filter((stop) => stop.phase !== 'active'),
    [pending, activeOrders],
  );

  const locationGroups = useMemo(
    () => flattenLocationGroupsToOrders(buildDriverLocationGroups(activeOrders, batches)),
    [activeOrders, batches],
  );

  const displayLocationGroups = useMemo(() => {
    if (!justDeliveredGroup) return locationGroups;
    return [
      justDeliveredGroup,
      ...locationGroups.filter((group) => group.id !== justDeliveredGroup.id),
    ];
  }, [locationGroups, justDeliveredGroup]);

  const pickupStops = useMemo(
    () => stops.filter((stop) => stop.type === 'pickup'),
    [stops],
  );

  const hasPickupQueue = pickupStops.length > 0;
  const hasDeliveryStops = displayLocationGroups.length > 0;
  const pendingDeliveryGroups = useMemo(
    () => displayLocationGroups.filter((group) => group.pendingCount > 0),
    [displayLocationGroups],
  );
  const selectionMode = pickupPendingCount === 0 && pendingDeliveryGroups.length > 0;
  const allPendingSelected =
    pendingDeliveryGroups.length > 0 &&
    pendingDeliveryGroups.every((group) => selectedGroupIds.includes(group.id));
  const selectedPendingGroups = pendingDeliveryGroups.filter((group) => selectedGroupIds.includes(group.id));
  const selectedLunchboxCount = selectedPendingGroups.reduce((total, group) => total + group.pendingCount, 0);

  const completedLocationGroups = useMemo(
    () => flattenLocationGroupsToOrders(buildCompletedLocationGroups(completed)),
    [completed],
  );

  const openVerify = async (order: DeliveryOrder) => {
    setActionError('');
    try {
      await markAtPickup(order.id);
      setVerifyOrder(order);
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update pickup status');
    }
  };

  const handleVerify = async (code: string) => {
    if (tripPickupVerify && currentPickupStop) {
      const error = await completePickupStop(currentPickupStop.id, code, assignedOrders);
      if (error) return error;
      setTripPickupVerify(false);
      const nextPickup = trip.pickupGroups.find(
        (group) => group.status === 'pending' && group.id !== currentPickupStop.id,
      );
      if (nextPickup) {
        void handleNavigateToRoute();
      } else {
        const nextDrop = trip.deliveryGroups.find((group) => group.status === 'pending');
        if (nextDrop) void handleNavigateToRoute();
      }
      await refresh();
      await refreshTripRoutes(assignedOrders);
      return null;
    }

    if (!verifyOrder) return 'No order selected';
    try {
      await verifyPickup(verifyOrder.id, code);
      await markPickedUp(verifyOrder.id);
      setVerifyOrder(null);
      await refresh();
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Verification failed';
    }
  };

  const handleDeliver = async (orderId: string) => {
    const order = activeOrders.find((entry) => entry.id === orderId);
    if (!order || order.status === 'delivered') return;

    setActionError('');
    setSingleDeliveringId(orderId);
    try {
      if (order.status !== 'at_drop') {
        await markAtDrop(orderId);
      }
      await markDelivered(orderId);
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not mark delivered');
    } finally {
      setSingleDeliveringId(null);
    }
  };

  const executeBulkDeliver = async (
    group: DriverLocationGroup,
    options?: { skipNextNav?: boolean; chained?: boolean },
  ) => {
    if (group.pendingCount === 0) return;
    if (deliveringRef.current && !options?.chained) return;

    deliveringRef.current = true;
    setBulkLoadingGroupId(options?.chained ? '__all__' : group.id);
    setActionError('');
    try {
      const pendingOrders = group.pendingOrders.filter((order) => order.status !== 'delivered');
      if (pendingOrders.length === 0) return;

      for (const order of pendingOrders) {
        if (order.status !== 'at_drop') {
          await markAtDrop(order.id);
        }
      }

      if (group.batchId) {
        await markBatchOrdersDelivered(group.batchId);
      } else {
        for (let index = 0; index < pendingOrders.length; index += 1) {
          await markDelivered(pendingOrders[index].id, { silent: index < pendingOrders.length - 1 });
        }
      }

      const deliveredAt = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      setSuccessGroups((current) => ({ ...current, [group.id]: deliveredAt }));
      setJustDeliveredGroup({
        ...group,
        orders: group.orders.map((order) => ({ ...order, status: 'delivered' as const, deliveredAt })),
        pendingOrders: [],
        deliveredOrders: group.orders,
        pendingCount: 0,
        deliveredCount: group.totalCount,
        isFullyDelivered: true,
      });
      setTimeout(() => {
        setJustDeliveredGroup((current) => (current?.id === group.id ? null : current));
        setSuccessGroups((current) => {
          const next = { ...current };
          delete next[group.id];
          return next;
        });
      }, 4000);

      if (tripActive && group.orders[0]) {
        completeDeliveryStop(`drop-${getLocationGroupKey(group.orders[0])}`);
        if (!options?.skipNextNav) {
          const nextDrop = trip.deliveryGroups.find(
            (entry) => entry.status === 'pending' && entry.id !== `drop-${getLocationGroupKey(group.orders[0])}`,
          );
          if (nextDrop) {
            void handleNavigateToRoute();
          }
        }
      }

      await refresh();
      if (tripActive) {
        await refreshTripRoutes(assignedOrders);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not deliver all lunchboxes');
      if (options?.chained) throw error;
    } finally {
      if (!options?.chained) {
        deliveringRef.current = false;
        setBulkLoadingGroupId(null);
      }
      setConfirmGroup(null);
    }
  };

  const toggleGroupSelected = (groupId: string) => {
    setSelectedGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId],
    );
  };

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedGroupIds([]);
      return;
    }
    setSelectedGroupIds(pendingDeliveryGroups.map((group) => group.id));
  };

  const executeSelectedDeliver = async () => {
    const groups = pendingDeliveryGroups.filter((group) => selectedGroupIds.includes(group.id));
    if (groups.length === 0) return;
    setConfirmAllSelected(false);
    deliveringRef.current = true;
    setBulkLoadingGroupId('__all__');
    try {
      for (const group of groups) {
        await executeBulkDeliver(group, { skipNextNav: true, chained: true });
      }
      setSelectedGroupIds([]);
    } catch {
      // Error text is set inside executeBulkDeliver.
    } finally {
      deliveringRef.current = false;
      setBulkLoadingGroupId(null);
    }
  };

  const callCustomer = (phone?: string) => {
    const normalized = phone?.replace(/\D/g, '').slice(-10);
    if (!normalized) return;
    void Linking.openURL(`tel:+91${normalized}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PickupVerifyDialog
        visible={Boolean(verifyOrder) || tripPickupVerify}
        orderLabel={
          tripPickupVerify && currentPickupStop
            ? `${currentPickupStop.orders.length} lunchbox${currentPickupStop.orders.length === 1 ? '' : 'es'} at ${currentPickupStop.locationName}`
            : verifyOrder?.customerName ?? ''
        }
        onVerify={handleVerify}
        onCancel={() => {
          setVerifyOrder(null);
          setTripPickupVerify(false);
        }}
      />
      <DriverTripCompletedDialog
        visible={showTripCompleted}
        ordersDelivered={stats.ordersDelivered || completed.length}
        totalDistanceKm={stats.totalDistanceKm || trip.totalDistanceKm}
        totalDurationMinutes={stats.totalDurationMinutes || trip.totalDurationMinutes}
        totalEarnings={stats.totalEarnings || completed.length * DRIVER_EARNING_PER_ORDER}
        completedAt={stats.completedAt}
        onClose={() => {
          setShowTripCompleted(false);
          resetTrip();
        }}
      />
      <DriverOrderAddressDialog
        visible={Boolean(addressOrder)}
        order={addressOrder}
        onClose={() => setAddressOrder(null)}
        onOpenRouteMap={() => void handleNavigateToRoute()}
      />
      <ConfirmDialog
        visible={Boolean(confirmGroup)}
        title="Confirm Delivery"
        message={
          confirmGroup
            ? `Are you sure you have delivered all lunchboxes at ${confirmGroup.locationName}?`
            : ''
        }
        confirmLabel="Confirm Delivery"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (confirmGroup) void executeBulkDeliver(confirmGroup);
        }}
        onCancel={() => {
          if (!bulkLoadingGroupId) setConfirmGroup(null);
        }}
      />
      <ConfirmDialog
        visible={confirmAllSelected}
        title="Confirm Delivery"
        message={
          selectedLunchboxCount > 0
            ? `Mark ${selectedLunchboxCount} lunchbox${selectedLunchboxCount === 1 ? '' : 'es'} at ${selectedPendingGroups.length} location${selectedPendingGroups.length === 1 ? '' : 's'} as delivered?`
            : ''
        }
        confirmLabel="Delivered"
        cancelLabel="Cancel"
        onConfirm={() => {
          void executeSelectedDeliver();
        }}
        onCancel={() => {
          if (!bulkLoadingGroupId) setConfirmAllSelected(false);
        }}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <DriverScreenHeader
          title="Deliveries"
          notificationCount={pending.length}
          onNotificationsPress={() => navigation.navigate('DriverNotifications')}
        />

        <DriverKpiRow
          compact
          items={[
            { label: 'Pickup Pending', value: String(pickupPendingCount), tone: 'red' },
            { label: 'Active', value: String(activeCount), tone: 'green' },
            { label: 'Delivered', value: String(completed.length), tone: 'blue' },
            { label: 'Pending', value: String(pending.length), tone: 'orange' },
            { label: 'Cancelled', value: String(cancelled.length), tone: 'pink' },
          ]}
        />

        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

        {tripActive ? (
          <Pressable style={styles.routeLink} onPress={() => navigation.navigate('DriverRoute')}>
            <View style={styles.routeLinkIcon}>
              <Ionicons name="map" size={20} color={colors.orange} />
            </View>
            <View style={styles.routeLinkMeta}>
              <Text style={styles.routeLinkTitle}>View Delivery Route</Text>
              <Text style={styles.routeLinkSub}>
                {activeRoute
                  ? `${trip.phase === 'pickup' ? 'Pickup' : 'Delivery'} · ${activeRoute.totalDistanceKm.toFixed(1)} km · ${activeRoute.totalDurationMinutes} min`
                  : 'Open map & navigation'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        ) : null}

        <Text style={styles.section}>Pickup Sequence</Text>
        {!hasPickupQueue ? (
          hasDeliveryStops ? null : (
            <Card flat>
              <Text style={styles.muted}>No pickups in your queue.</Text>
            </Card>
          )
        ) : (
          pickupStops.map((stop, index) => (
            <View key={stop.key} style={styles.stopRow}>
              <View style={styles.timelineCol}>
                <View style={styles.stopNumber}>
                  <Text style={styles.stopNumberText}>{stop.stopNumber}</Text>
                </View>
                {index < pickupStops.length - 1 ? <View style={styles.timelineLine} /> : null}
              </View>

              <Card style={styles.stopCard}>
                <Pressable onPress={() => setAddressOrder(stop.order)}>
                  <View style={styles.stopHeader}>
                    <Text style={styles.stopId}>{stop.order.id}</Text>
                    <Badge label={phaseLabel(stop.phase)} tone={phaseTone(stop.phase)} />
                  </View>
                  <Text style={styles.stopTitle}>{stop.title}</Text>
                  <Text style={styles.stopAddress} numberOfLines={3}>
                    Pickup: {stop.address || '—'}
                  </Text>
                  <Text style={styles.dropHint} numberOfLines={2}>
                    Deliver to: {getDropAddress(stop.order)}
                  </Text>
                  <Text style={styles.stopTime}>{stop.timeLabel}</Text>
                </Pressable>

                <View style={styles.stopActions}>
                  {stop.phase === 'pickup_pending' ? (
                    <>
                      <StopAction
                        label="OTP"
                        onPress={() => {
                          if (tripActive && currentPickupStop) {
                            setTripPickupVerify(true);
                            return;
                          }
                          void openVerify(stop.order);
                        }}
                      />
                      <StopAction
                        label="QR"
                        onPress={() => {
                          if (tripActive && currentPickupStop) {
                            setTripPickupVerify(true);
                            return;
                          }
                          void openVerify(stop.order);
                        }}
                      />
                      <StopAction
                        label="Nav"
                        variant="green"
                        onPress={() => void handleNavigateToRoute()}
                      />
                    </>
                  ) : null}
                  {stop.phase === 'pending' ? (
                    <StopAction label="Details" onPress={() => setAddressOrder(stop.order)} />
                  ) : null}
                  <StopAction label="Call" onPress={() => callCustomer(stop.order.customerPhone)} />
                </View>
              </Card>
            </View>
          ))
        )}

        {hasDeliveryStops ? (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>Delivery Stops</Text>
              {selectionMode ? (
                <Pressable onPress={toggleSelectAll} hitSlop={8}>
                  <Text style={styles.selectAllText}>
                    {allPendingSelected ? 'Clear all' : 'Select all'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            {displayLocationGroups.map((group) => (
              <DriverBulkDeliveryCard
                key={group.id}
                group={group}
                deliveredAt={successGroups[group.id]}
                bulkLoading={bulkLoadingGroupId === group.id || bulkLoadingGroupId === '__all__'}
                singleDeliveringId={singleDeliveringId}
                selectable={selectionMode && group.pendingCount > 0}
                selected={selectedGroupIds.includes(group.id)}
                hidePerGroupDeliver={selectionMode}
                onToggleSelect={() => toggleGroupSelected(group.id)}
                onNavigate={() => void handleNavigateToRoute()}
                onDeliverAll={setConfirmGroup}
                onDeliverOne={(order) => void handleDeliver(order.id)}
              />
            ))}
            {selectionMode ? (
              <Pressable
                style={({ pressed }) => [
                  styles.commonDeliverBtn,
                  (selectedLunchboxCount === 0 || Boolean(bulkLoadingGroupId)) && styles.commonDeliverBtnDisabled,
                  pressed && selectedLunchboxCount > 0 && !bulkLoadingGroupId && styles.commonDeliverBtnPressed,
                ]}
                onPress={() => {
                  if (selectedLunchboxCount === 0 || bulkLoadingGroupId) return;
                  setConfirmAllSelected(true);
                }}
                disabled={selectedLunchboxCount === 0 || Boolean(bulkLoadingGroupId)}
              >
                {bulkLoadingGroupId === '__all__' ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-outline" size={20} color={colors.onPrimary} />
                    <Text style={styles.commonDeliverText}>
                      {selectedLunchboxCount > 0
                        ? `Delivered (${selectedLunchboxCount})`
                        : 'Delivered'}
                    </Text>
                  </>
                )}
              </Pressable>
            ) : null}
          </>
        ) : null}

        <Text style={styles.section}>Completed Today</Text>
        {completedLocationGroups.length === 0 ? (
          <Card flat>
            <Text style={styles.muted}>No completed deliveries yet today.</Text>
          </Card>
        ) : (
          completedLocationGroups.map((group) => (
            <DriverBulkDeliveryCard
              key={group.id}
              group={group}
              deliveredAt={group.orders.find((order) => order.deliveredAt)?.deliveredAt}
              readOnly
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: 28, gap: 14 },
  section: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 4 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  selectAllText: { fontSize: 13, fontWeight: '800', color: colors.orange },
  commonDeliverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.green,
    borderRadius: 28,
    paddingVertical: 14,
    minHeight: 50,
  },
  commonDeliverBtnDisabled: { opacity: 0.45 },
  commonDeliverBtnPressed: { opacity: 0.94, transform: [{ scale: 0.99 }] },
  commonDeliverText: { fontSize: 15, fontWeight: '800', color: colors.onPrimary },
  stopRow: { flexDirection: 'row', gap: 10 },
  timelineCol: { width: 34, alignItems: 'center' },
  stopNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNumberText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 4,
    minHeight: 24,
  },
  stopCard: { flex: 1, minWidth: 0, marginBottom: 4, padding: spacing.md },
  stopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  stopId: { fontSize: 13, fontWeight: '800', color: colors.text, flex: 1 },
  stopTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 8 },
  stopAddress: { fontSize: 12, color: colors.muted, marginTop: 4, lineHeight: 18, fontWeight: '600' },
  dropHint: { fontSize: 12, color: colors.orangeDark, marginTop: 6, lineHeight: 18, fontWeight: '700' },
  stopTime: { fontSize: 11, color: colors.muted, marginTop: 6, fontWeight: '600' },
  stopActions: { flexDirection: 'row', gap: 6, marginTop: 12 },
  stopActionBtn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.orange,
  },
  stopActionBtnGreen: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  stopActionBtnPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  stopActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.orange,
    textAlign: 'center',
  },
  stopActionTextGreen: {
    color: colors.onPrimary,
  },
  completedCard: { paddingVertical: 12 },
  routeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadow.card,
  },
  routeLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLinkMeta: { flex: 1 },
  routeLinkTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  routeLinkSub: { fontSize: 12, color: colors.muted, marginTop: 2, fontWeight: '600' },
  muted: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  error: { color: colors.red, fontSize: 13 },
});
