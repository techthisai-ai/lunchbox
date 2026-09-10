import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { PickupVerifyDialog } from '../../components/PickupVerifyDialog';
import { DriverTripMap } from '../../components/driver/DriverTripMap';
import { DriverScreenHeader } from '../../components/driver/DriverScreenHeader';
import { colors, radius, shadow, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useDriverTrip } from '../../context/DriverTripContext';
import { DriverTabParamList, RootStackParamList } from '../../navigation/types';
import { isNearStop } from '../../services/enfieldMapsService';
import { openMapsNavigation } from '../../services/mapsNavigation';
import {
  listDriverActiveOrders,
  listDriverCompletedToday,
  listPendingPickups,
} from '../../services/orderHubService';
import { subscribeToOrderChanges } from '../../services/orderSync';
import { DeliveryOrder } from '../../types/delivery';
import { getAssignedDriverOrders, getLunchboxCount, TripStopGroup } from '../../utils/driverTripNavigation';

const ROUTE_LOGO = require('../../../assets/route-logo.png');

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<DriverTabParamList, 'DriverRoute'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function RouteSummaryStat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryStat}>
      <View style={styles.summaryIconWrap}>
        <Ionicons name={icon} size={16} color={colors.orange} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function lunchboxCountLabel(orders: DeliveryOrder[]): string {
  const count = getLunchboxCount(orders);
  return `${count} lunchbox${count === 1 ? '' : 'es'}`;
}

function UpcomingStopRow({ group, isNext }: { group: TripStopGroup; isNext: boolean }) {
  const boxes = lunchboxCountLabel(group.orders);
  return (
    <View style={[styles.upcomingRow, isNext && styles.upcomingRowNext]}>
      <View style={[styles.upcomingBadge, isNext && styles.upcomingBadgeNext]}>
        <Text style={[styles.upcomingBadgeText, isNext && styles.upcomingBadgeTextNext]}>
          {group.sequence}
        </Text>
      </View>
      <View style={styles.upcomingMeta}>
        <Text style={styles.upcomingTitle} numberOfLines={1}>
          {group.locationName}
        </Text>
        <Text style={styles.upcomingSub} numberOfLines={2}>
          {group.type === 'drop'
            ? `${boxes} · ${group.address.split(',')[0]?.trim() || group.address}`
            : `${boxes} · ${group.address.split(',')[0]?.trim() || group.address}`}
        </Text>
      </View>
      {isNext ? <Badge label="Next" tone="orange" /> : null}
    </View>
  );
}

export function DriverRouteScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const { height: windowHeight } = useWindowDimensions();
  const mapHeight = Math.max(320, Math.min(windowHeight * 0.44, 420));

  const {
    trip,
    tripActive,
    driverLocation,
    activeRoute,
    activePhase,
    currentPickupStop,
    currentDeliveryStop,
    refreshTripRoutes,
    resumeTrip,
    refreshDriverLocation,
    completePickupStop,
    markPickupStopReached,
    markDeliveryStopReached,
  } = useDriverTrip();

  const [pendingCount, setPendingCount] = useState(0);
  const [assignedOrders, setAssignedOrders] = useState<DeliveryOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<DeliveryOrder[]>([]);
  const [tripPickupVerify, setTripPickupVerify] = useState(false);
  const [recenterToken, setRecenterToken] = useState(0);
  const [locating, setLocating] = useState(false);
  const promptedStopRef = useRef<string | null>(null);
  const suppressAutoVerifyUntilRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const [activeList, done, pendingList] = await Promise.all([
      listDriverActiveOrders(user.id),
      listDriverCompletedToday(user.id),
      listPendingPickups(),
    ]);
    setAssignedOrders(getAssignedDriverOrders(activeList));
    setCompletedOrders(done);
    setPendingCount(pendingList.length);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const interval = setInterval(refresh, 5000);
      return () => clearInterval(interval);
    }, [refresh]),
  );

  useEffect(() => subscribeToOrderChanges(refresh), [refresh]);

  useEffect(() => {
    if (assignedOrders.length === 0) return undefined;
    void resumeTrip(assignedOrders);
    const interval = setInterval(() => {
      void resumeTrip(assignedOrders);
    }, 8000);
    return () => clearInterval(interval);
  }, [assignedOrders, resumeTrip]);

  useEffect(() => {
    if (!tripActive || !driverLocation) return;
    if (Date.now() < suppressAutoVerifyUntilRef.current) return;

    if (trip.phase === 'pickup' && currentPickupStop && isNearStop(driverLocation, currentPickupStop.point)) {
      if (promptedStopRef.current === currentPickupStop.id) return;
      promptedStopRef.current = currentPickupStop.id;
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

  const phase = trip.phase === 'pickup' ? 'pickup' : trip.phase === 'delivery' ? 'delivery' : 'idle';
  const currentStop = trip.phase === 'pickup' ? currentPickupStop : currentDeliveryStop;

  const pendingStops = useMemo(() => {
    const groups = trip.phase === 'pickup' ? trip.pickupGroups : trip.deliveryGroups;
    return groups
      .filter((group) => group.status === 'pending')
      .sort((a, b) => a.sequence - b.sequence || a.locationName.localeCompare(b.locationName));
  }, [trip.phase, trip.pickupGroups, trip.deliveryGroups]);

  const upcomingStops = useMemo(
    () => pendingStops.filter((group) => group.id !== trip.currentStopId),
    [pendingStops, trip.currentStopId],
  );

  const totalStops = pendingStops.length;
  const distanceLabel = activeRoute ? `${activeRoute.totalDistanceKm.toFixed(1)} km` : '—';
  const etaLabel = activeRoute ? `${activeRoute.totalDurationMinutes} min` : '—';
  const phaseLabel = activePhase === 'pickup' ? 'Pickup phase' : activePhase === 'delivery' ? 'Delivery phase' : '';

  const handleCurrentLocation = async () => {
    setLocating(true);
    try {
      await refreshDriverLocation();
      setRecenterToken((token) => token + 1);
    } finally {
      setLocating(false);
    }
  };

  const handleStartNavigation = () => {
    if (currentStop?.point) {
      void openMapsNavigation(currentStop.point, driverLocation ?? undefined, currentStop.address).catch(() => {
        setRecenterToken((token) => token + 1);
      });
      return;
    }
    setRecenterToken((token) => token + 1);
  };

  const handleVerify = async (code: string) => {
    if (!tripPickupVerify || !currentPickupStop) return 'No pickup selected';
    try {
      const stopId = currentPickupStop.id;
      const error = await completePickupStop(stopId, code, assignedOrders);
      if (error) return error;
      promptedStopRef.current = stopId;
      suppressAutoVerifyUntilRef.current = Date.now() + 20000;
      setTripPickupVerify(false);
      await refresh();
      if (user?.id) {
        const activeList = await listDriverActiveOrders(user.id);
        await refreshTripRoutes(getAssignedDriverOrders(activeList));
      }
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Verification failed';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PickupVerifyDialog
        visible={tripPickupVerify}
        orderLabel={
          currentPickupStop
            ? `${lunchboxCountLabel(currentPickupStop.orders)} at ${currentPickupStop.locationName}`
            : ''
        }
        onVerify={handleVerify}
        onCancel={() => setTripPickupVerify(false)}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        <DriverScreenHeader
          title="Delivery Route"
          notificationCount={pendingCount}
          onNotificationsPress={() => navigation.navigate('DriverNotifications')}
        />

        {tripActive && phaseLabel ? (
          <View style={styles.phasePill}>
            <Ionicons
              name={activePhase === 'pickup' ? 'restaurant-outline' : 'location-outline'}
              size={14}
              color={colors.orange}
            />
            <Text style={styles.phasePillText}>{phaseLabel}</Text>
          </View>
        ) : null}

        {!tripActive ? (
          <Card style={styles.emptyCard}>
            <Image
              source={ROUTE_LOGO}
              style={styles.emptyLogo}
              resizeMode="contain"
              accessibilityLabel="Chef Queen"
            />
            <Text style={styles.emptyTitle}>No active route</Text>
            <Text style={styles.emptyText}>
              Accept pickups on Home, then tap Start Trip to see your optimized delivery route here.
            </Text>
            <Button title="Go to Home" onPress={() => navigation.navigate('DriverHome')} style={styles.emptyBtn} />
          </Card>
        ) : (
          <>
            <View style={styles.summaryBar}>
              <RouteSummaryStat icon="flag-outline" label="Stops" value={String(totalStops)} />
              <View style={styles.summaryDivider} />
              <RouteSummaryStat icon="speedometer-outline" label="Distance" value={distanceLabel} />
              <View style={styles.summaryDivider} />
              <RouteSummaryStat icon="time-outline" label="Est. time" value={etaLabel} />
            </View>

            <View style={[styles.mapSection, { height: mapHeight }]}>
              <DriverTripMap
                variant="full"
                height={mapHeight}
                phase={phase}
                route={activeRoute}
                pickupGroups={trip.pickupGroups}
                deliveryGroups={trip.deliveryGroups}
                driverLocation={driverLocation}
                currentStopId={trip.currentStopId}
                recenterToken={recenterToken}
              />

              <View style={styles.floatingActions} pointerEvents="box-none">
                <Pressable
                  style={({ pressed }) => [styles.fab, styles.fabSecondary, pressed && styles.fabPressed]}
                  onPress={() => void handleCurrentLocation()}
                  accessibilityRole="button"
                  accessibilityLabel="Current location"
                >
                  <Ionicons name={locating ? 'locate' : 'locate-outline'} size={20} color={colors.text} />
                  <Text style={styles.fabSecondaryText}>My Location</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.fab, styles.fabPrimary, pressed && styles.fabPressed]}
                  onPress={handleStartNavigation}
                  accessibilityRole="button"
                  accessibilityLabel="Show full route on this map"
                >
                  <Ionicons name="navigate" size={20} color={colors.onPrimary} />
                  <Text style={styles.fabPrimaryText}>Start Navigation</Text>
                </Pressable>
              </View>
            </View>

            {currentStop ? (
              <View style={styles.currentStopCard}>
                <View style={styles.currentStopHeader}>
                  <View style={styles.currentStopBadge}>
                    <Text style={styles.currentStopBadgeText}>{currentStop.sequence}</Text>
                  </View>
                  <View style={styles.currentStopMeta}>
                    <Text style={styles.currentStopLabel}>
                      {trip.phase === 'pickup' ? 'Current Pickup' : 'Current Drop'}
                    </Text>
                    <Text style={styles.currentStopTitle} numberOfLines={2}>
                      {currentStop.locationName}
                    </Text>
                  </View>
                  <Badge label="Now" tone="orange" />
                </View>
                {currentStop.address &&
                currentStop.address.trim().toLowerCase() !== currentStop.locationName.trim().toLowerCase() ? (
                  <Text style={styles.currentStopAddress} numberOfLines={3}>
                    {currentStop.address}
                  </Text>
                ) : null}
                <Text style={styles.currentStopOrders}>
                  {trip.phase === 'delivery'
                    ? `${lunchboxCountLabel(currentStop.orders)} · ${currentStop.address.split(',')[0]?.trim() || currentStop.address}`
                    : `${lunchboxCountLabel(currentStop.orders)} · ${currentStop.address.split(',')[0]?.trim() || currentStop.address}`}
                </Text>
                {trip.phase === 'pickup' ? (
                  <Pressable style={styles.verifyBtn} onPress={() => setTripPickupVerify(true)}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={colors.orange} />
                    <Text style={styles.verifyBtnText}>Verify Pickup OTP</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {upcomingStops.length > 0 ? (
              <View style={styles.upcomingSection}>
                <Text style={styles.sectionTitle}>Upcoming Stops</Text>
                <Card style={styles.upcomingCard}>
                  {upcomingStops.map((group, index) => (
                    <UpcomingStopRow key={group.id} group={group} isNext={index === 0} />
                  ))}
                </Card>
              </View>
            ) : null}

            <Pressable style={styles.deliveriesLink} onPress={() => navigation.navigate('DriverDeliveries')}>
              <Ionicons name="list-outline" size={18} color={colors.orange} />
              <Text style={styles.deliveriesLinkText}>Manage deliveries & OTP</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: 40, gap: 16 },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: colors.orangeLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  phasePillText: { fontSize: 12, fontWeight: '700', color: colors.orangeDark },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 12,
    ...shadow.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  summaryStat: { flex: 1, alignItems: 'center', gap: 2 },
  summaryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  summaryValue: { fontSize: 16, fontWeight: '800', color: colors.text },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: colors.muted },
  summaryDivider: { width: 1, height: 36, backgroundColor: colors.borderSubtle },
  mapSection: { position: 'relative', zIndex: 2 },
  floatingActions: {
    position: 'absolute',
    bottom: 16,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 10,
  },
  fab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.full,
  },
  fabPrimary: {
    backgroundColor: colors.orange,
    ...shadow.elevated,
  },
  fabSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadow.card,
  },
  fabPrimaryText: { color: colors.onPrimary, fontWeight: '800', fontSize: 13 },
  fabSecondaryText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  fabPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  fabDisabled: { opacity: 0.45 },
  currentStopCard: {
    backgroundColor: colors.orangeLight,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.orange,
    ...shadow.card,
  },
  currentStopHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currentStopBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentStopBadgeText: { color: colors.onPrimary, fontWeight: '800', fontSize: 16 },
  currentStopMeta: { flex: 1 },
  currentStopLabel: { fontSize: 11, fontWeight: '700', color: colors.orangeDark, textTransform: 'uppercase' },
  currentStopTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 2 },
  currentStopAddress: { fontSize: 13, color: colors.muted, marginTop: 10, fontWeight: '600', lineHeight: 19 },
  currentStopOrders: { fontSize: 12, color: colors.text, marginTop: 6, fontWeight: '700' },
  verifyBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    ...shadow.subtle,
  },
  verifyBtnText: { fontSize: 13, fontWeight: '700', color: colors.orange },
  upcomingSection: { gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  upcomingCard: { paddingVertical: 4, gap: 0 },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  upcomingRowNext: { backgroundColor: 'rgba(233,30,99,0.04)' },
  upcomingBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingBadgeNext: { backgroundColor: colors.orangeLight },
  upcomingBadgeText: { fontSize: 13, fontWeight: '800', color: colors.muted },
  upcomingBadgeTextNext: { color: colors.orange },
  upcomingMeta: { flex: 1 },
  upcomingTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  upcomingSub: { fontSize: 12, color: colors.muted, marginTop: 2, fontWeight: '600' },
  deliveriesLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    ...shadow.subtle,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  deliveriesLinkText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  emptyCard: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, ...shadow.card },
  emptyLogo: {
    width: 168,
    height: 168,
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    fontWeight: '600',
  },
  emptyBtn: { marginTop: 20, alignSelf: 'stretch' },
});

