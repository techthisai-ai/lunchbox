import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DriverKpiRow } from '../../components/driver/DriverKpiRow';
import { DriverScreenHeader } from '../../components/driver/DriverScreenHeader';
import { DriverOrderAddressDialog } from '../../components/DriverOrderAddressDialog';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { navigateAfterDriverLogin } from '../../navigation/driverRoutes';
import { DriverTabParamList, RootStackParamList } from '../../navigation/types';
import {
  acceptPickup,
  listDriverActiveOrders,
  listDriverCompletedToday,
  subscribeToDriverOrdersToday,
  subscribeToPendingPickups,
} from '../../services/orderHubService';
import { refreshDriverLocationForOrders, stopDriverLocationTracking } from '../../services/driverLocationService';
import { openMapsNavigationToAddress } from '../../services/mapsNavigation';
import { subscribeToOrderChanges } from '../../services/orderSync';
import { DeliveryOrder, getDropAddress } from '../../types/delivery';
import { DRIVER_EARNING_PER_ORDER } from '../../utils/adminDriverHelpers';

type DriverHomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<DriverTabParamList, 'DriverHome'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function DriverHomeScreen() {
  const { user, refreshDriverProfile } = useAuth();
  const navigation = useNavigation<DriverHomeNavigation>();
  const [pending, setPending] = useState<DeliveryOrder[]>([]);
  const [activeOrders, setActiveOrders] = useState<DeliveryOrder[]>([]);
  const [completedToday, setCompletedToday] = useState<DeliveryOrder[]>([]);
  const [addressOrder, setAddressOrder] = useState<DeliveryOrder | null>(null);
  const [actionError, setActionError] = useState('');
  const [todayEarnings, setTodayEarnings] = useState(0);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const [mine, done] = await Promise.all([
      listDriverActiveOrders(user.id),
      listDriverCompletedToday(user.id),
    ]);
    setActiveOrders(mine);
    setCompletedToday(done);
    setTodayEarnings(done.length * DRIVER_EARNING_PER_ORDER);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.phone) return;
      refreshDriverProfile().then((profile) => {
        if (profile?.driverApprovalStatus && profile.driverApprovalStatus !== 'approved') {
          navigateAfterDriverLogin(navigation, user.phone!);
        }
      });
    }, [navigation, refreshDriverProfile, user?.phone]),
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
      const interval = setInterval(refresh, 3000);
      return () => clearInterval(interval);
    }, [refresh]),
  );

  useEffect(() => subscribeToPendingPickups(setPending), []);
  useEffect(() => {
    if (!user?.id) return undefined;
    return subscribeToDriverOrdersToday(user.id, setActiveOrders);
  }, [user?.id]);

  useEffect(() => subscribeToOrderChanges(refresh), [refresh]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const orderIds = activeOrders.map((o) => o.id);
    refreshDriverLocationForOrders(user.id, orderIds);
    return () => {
      stopDriverLocationTracking();
    };
  }, [user?.id, activeOrders]);

  const assignedToday = pending.length + activeOrders.length + completedToday.length;
  const routePlan = activeOrders.find((o) => o.routePlan)?.routePlan;

  const nextPickup = useMemo(() => {
    const atPickup = activeOrders.find((o) =>
      ['driver_assigned', 'at_pickup', 'pickup_verified'].includes(o.status),
    );
    return atPickup ?? pending[0] ?? null;
  }, [activeOrders, pending]);

  const handleAccept = async (orderId: string) => {
    if (!user?.id || !user.name) return;
    setActionError('');
    try {
      const accepted = await acceptPickup(orderId, {
        id: user.id,
        name: user.name,
        vehicle: user.vehicle,
        phone: user.phone,
      });
      await openMapsNavigationToAddress(accepted.pickupAddress);
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not accept pickup');
      await refresh();
    }
  };

  const handleStartTrip = () => {
    if (nextPickup) {
      void openMapsNavigationToAddress(nextPickup.pickupAddress);
      return;
    }
    navigation.navigate('DriverDeliveries');
  };

  const firstName = user?.name?.trim().split(' ')[0] || 'Driver';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DriverOrderAddressDialog
        visible={Boolean(addressOrder)}
        order={addressOrder}
        onClose={() => setAddressOrder(null)}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <DriverScreenHeader
          greetingName={firstName}
          notificationCount={pending.length}
          onNotificationsPress={() => navigation.navigate('DriverNotifications')}
        />

        <DriverKpiRow
          items={[
            {
              label: 'Today Deliveries',
              value: String(assignedToday),
              tone: 'purple',
              icon: 'clipboard-outline',
            },
            {
              label: 'Completed Today',
              value: `${completedToday.length}/${Math.max(assignedToday, 1)}`,
              tone: 'green',
              icon: 'checkmark-circle-outline',
            },
            {
              label: "Today's Earnings",
              value: `₹${todayEarnings.toLocaleString('en-IN')}`,
              tone: 'pink',
              icon: 'wallet-outline',
            },
          ]}
        />

        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

        <Text style={styles.section}>Next Pickup</Text>
        {nextPickup ? (
          <Card style={styles.nextCard}>
            <View style={styles.nextTop}>
              <View style={styles.nextIcon}>
                <Ionicons name="time-outline" size={18} color={colors.orange} />
              </View>
              <View style={styles.nextMeta}>
                <Text style={styles.nextTime}>{nextPickup.foodReadyAt ?? nextPickup.bookedAt ?? 'Ready now'}</Text>
                <Text style={styles.nextAddress} numberOfLines={2}>
                  {nextPickup.pickupAddress}
                </Text>
              </View>
            </View>
            <Button
              title="Navigate"
              variant="green"
              small
              onPress={() => openMapsNavigationToAddress(nextPickup.pickupAddress)}
              style={styles.nextBtn}
            />
          </Card>
        ) : (
          <Card flat>
            <Text style={styles.muted}>No pickup scheduled right now.</Text>
          </Card>
        )}

        <Card style={styles.tripBanner}>
          <View style={styles.tripRow}>
            <View style={styles.tripIcon}>
              <Ionicons name="map-outline" size={22} color={colors.orange} />
            </View>
            <View style={styles.tripText}>
              <Text style={styles.tripTitle}>Trip Optimization</Text>
              <Text style={styles.tripSub}>
                {routePlan
                  ? `${routePlan.totalStops} stops · ETA ${routePlan.etaMinutes} min`
                  : 'Plan your route for faster deliveries'}
              </Text>
            </View>
          </View>
          <Button title="Start Trip" onPress={handleStartTrip} style={{ marginTop: 12 }} />
        </Card>

        <Text style={styles.section}>New Pickup Requests</Text>
        {pending.length === 0 ? (
          <Card flat>
            <Text style={styles.muted}>No new pickup requests.</Text>
          </Card>
        ) : (
          pending.map((order) => (
            <Card key={order.id} style={styles.requestCard}>
              <Pressable onPress={() => setAddressOrder(order)}>
                <View style={styles.requestTop}>
                  <Text style={styles.orderId}>{order.id}</Text>
                  <Badge label="Food Ready" tone="green" />
                </View>
                <Text style={styles.routePreview} numberOfLines={2}>
                  {order.pickupAddress} → {getDropAddress(order)}
                </Text>
              </Pressable>
              <Button title="Accept" variant="green" small onPress={() => handleAccept(order.id)} style={{ marginTop: 12 }} />
            </Card>
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
  nextCard: { padding: spacing.md },
  nextTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  nextIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextMeta: { flex: 1, minWidth: 0 },
  nextTime: { fontSize: 15, fontWeight: '800', color: colors.text },
  nextAddress: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18, fontWeight: '600' },
  nextBtn: { alignSelf: 'flex-start', marginTop: 12 },
  tripBanner: {
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.25)',
  },
  tripRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  tripIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripText: { flex: 1, minWidth: 0 },
  tripTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  tripSub: { fontSize: 12, color: colors.muted, marginTop: 4, fontWeight: '600' },
  requestCard: { padding: spacing.md },
  requestTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  orderId: { fontSize: 14, fontWeight: '800', color: colors.text, flex: 1 },
  routePreview: { fontSize: 12, color: colors.muted, marginTop: 8, lineHeight: 18, fontWeight: '600' },
  muted: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  error: { color: colors.red, fontSize: 13 },
});
