import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useDelivery } from '../context/DeliveryContext';
import { useFoodReadyOverlay } from '../context/FoodReadyOverlayContext';
import { useResponsive } from '../hooks/useResponsive';
import { useLiveEta } from '../hooks/useLiveEta';
import { HomeStackParamList } from '../navigation/types';
import { DeliveryHistoryEntry, syncDeliveryHistory } from '../services/deliveryHistoryService';
import { listCustomerOrders } from '../services/orderHubService';
import { getStatusBadgeTone, getStatusLabel } from '../services/orderHubService';
import { loadActiveSubscription, checkSubscriptionRenewalReminders } from '../services/subscriptionService';
import { SubscriptionPlan } from '../constants/subscriptions';
import { DeliveryProfile, FoodReadyDetails, getDropAddress, normalizeDeliveryType } from '../types/delivery';
import { getSubscriptionRenewalLabel } from '../utils/date';
import { callDriver } from '../utils/phoneCall';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

const FOOD_READY_FORM_STATUSES = new Set(['booked', 'food_ready', 'awaiting_driver']);

const quickActions = [
  { icon: 'location' as const, label: 'Track', screen: true, bg: colors.orangeLight, color: colors.orange },
  { icon: 'document-text' as const, label: 'History', tab: 'History' as const, bg: colors.greenLight, color: colors.green },
  { icon: 'wallet' as const, label: 'Wallet', route: 'Wallet' as const, bg: colors.blueLight, color: colors.blue },
  { icon: 'gift' as const, label: 'Refer', route: 'Referral' as const, bg: colors.purpleLight, color: colors.purple },
];

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { order, submitting, markFoodReady, refreshDelivery } = useDelivery();
  const { openFoodReadyDialog } = useFoodReadyOverlay();
  const { foodReadySize, horizontalPadding } = useResponsive();
  const liveEtaMinutes = useLiveEta(order);
  const [errorMessage, setErrorMessage] = useState('');
  const [recentHistory, setRecentHistory] = useState<DeliveryHistoryEntry[]>([]);
  const [activePlan, setActivePlan] = useState<SubscriptionPlan | null>(null);
  const displayName = user?.name || 'Guest';
  const isInTransit = order?.status === 'in_transit' || order?.status === 'at_drop' || order?.status === 'picked_up';
  const hasDriver = Boolean(order?.driver);
  const loadHistory = useCallback(async () => {
    if (!user?.phone) {
      setRecentHistory([]);
      return;
    }
    const orders = await listCustomerOrders(user.phone);
    const history = await syncDeliveryHistory(user.phone, orders);
    setRecentHistory(history.slice(0, 2));
  }, [user?.phone]);

  const loadSubscription = useCallback(async () => {
    if (!user?.phone) {
      setActivePlan(null);
      return;
    }
    setActivePlan(await loadActiveSubscription(user.phone));
    await checkSubscriptionRenewalReminders(user.phone);
  }, [user?.phone]);

  useFocusEffect(
    useCallback(() => {
      refreshDelivery();
      loadHistory();
      loadSubscription();
    }, [refreshDelivery, loadHistory, loadSubscription]),
  );

  const goToFoodReady = useCallback(() => {
    navigation.navigate('FoodReady');
  }, [navigation]);

  const buildFoodReadyDefaults = useCallback(
    (profile?: DeliveryProfile): Partial<FoodReadyDetails> => ({
      name: user?.name || profile?.name || '',
      deliveryType: normalizeDeliveryType(order?.deliveryType),
      pickupAddress: order?.pickupAddress || profile?.address || '',
      dropAddress: (order ? getDropAddress(order) : '') || profile?.school || '',
      person: order?.studentName || profile?.studentName || '',
    }),
    [order, user?.name],
  );

  const handleConfirmFoodReady = useCallback(
    async (details: FoodReadyDetails) => {
      const result = await markFoodReady(details);
      if (result.error) {
        setErrorMessage(result.error);
        return;
      }
      if (result.order) {
        goToFoodReady();
      }
    },
    [markFoodReady, goToFoodReady],
  );

  const handleFoodReady = () => {
    const showForm = !order || FOOD_READY_FORM_STATUSES.has(order.status);
    if (!showForm) {
      goToFoodReady();
      return;
    }

    setErrorMessage('');

    openFoodReadyDialog({
      initialValues: buildFoodReadyDefaults(),
      submitting,
      onConfirm: handleConfirmFoodReady,
    });
  };

  const isOrderCancelled = order?.status === 'pickup_closed';
  const statusLabel = order ? getStatusLabel(order.status) : 'Pending';
  const statusTone = order ? getStatusBadgeTone(order.status) : 'orange';
  const deliveryLine = order
    ? `${order.studentName} · ${order.school}`
    : 'Book pickup & delivery to get started';
  const etaDisplay = isOrderCancelled
    ? 'Cancelled'
    : liveEtaMinutes != null && order?.driver
      ? `${liveEtaMinutes} min`
      : order?.estimatedArrival ??
        (order?.status === 'awaiting_driver' ? 'Finding driver...' : order?.status === 'booked' ? 'Mark food ready' : '—');
  const etaLabel = isOrderCancelled
    ? null
    : liveEtaMinutes != null && order?.driver
      ? 'Estimated arrival'
      : order?.estimatedArrival
        ? 'Estimated arrival'
        : !order
          ? 'Waiting for booking'
          : null;
  const showDriverStatus = Boolean(
    order && order.status !== 'booked' && order.status !== 'delivered' && !isOrderCancelled,
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </Pressable>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <LinearGradient colors={[colors.orangeLight, colors.white]} style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.cardTitle}>Today's Delivery</Text>
            <Badge label={statusLabel} tone={statusTone} />
          </View>
          <Text style={styles.muted}>{deliveryLine}</Text>
          <Text style={[styles.eta, isOrderCancelled && styles.cancelledEta]} numberOfLines={2}>
            {etaDisplay}
          </Text>
          {etaLabel ? <Text style={styles.etaLabel}>{etaLabel}</Text> : null}
        </LinearGradient>

        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

        {!isOrderCancelled ? (
        <Pressable
          style={[
            styles.foodReady,
            {
              width: foodReadySize,
              height: foodReadySize,
              borderRadius: foodReadySize / 2,
            },
            submitting && styles.foodReadyDisabled,
          ]}
          onPress={handleFoodReady}
          disabled={submitting}
          accessibilityRole="button"
        >
          <Ionicons name="fast-food" size={36} color={colors.white} />
          <Text style={styles.foodReadyLabel}>Food Ready</Text>
          <Text style={styles.foodReadySub}>Tap when lunch is packed</Text>
        </Pressable>
        ) : null}

        {showDriverStatus ? (
          <Card
            title="Driver Status"
            badge={
              <Badge
                label={hasDriver ? (isInTransit ? 'En Route' : 'Assigned') : 'Waiting'}
                tone={hasDriver ? 'green' : 'orange'}
              />
            }
          >
            <View style={styles.driverRow}>
              <Avatar initials={order?.driver?.initials ?? '—'} large />
              <View style={styles.driverInfo}>
                {order?.driver ? (
                  <>
                    <Text style={styles.driverName} numberOfLines={1}>
                      {order.driver.name}
                    </Text>
                    <Text style={styles.muted} numberOfLines={2}>
                      {`${order.driver.vehicle} · ★ ${order.driver.rating}`}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.driverName} numberOfLines={2}>
                    Driver not assigned yet
                  </Text>
                )}
              </View>
              <Button
                title="Call"
                variant="outline"
                small
                onPress={() => {
                  if (order) void callDriver(order);
                }}
              />
            </View>
            {order && order.status !== 'booked' && order.status !== 'delivered' ? (
              <Button
                title="Show Pickup QR / OTP"
                variant="green"
                onPress={() => navigation.getParent()?.navigate('Track', { screen: 'QRTracking' })}
                style={{ marginTop: 12 }}
              />
            ) : null}
          </Card>
        ) : null}

        <Card flat title="Active Subscription" badge={<Badge label={activePlan?.badgeLabel ?? 'Student · 1M'} tone="green" />}>
          <Text style={styles.subText}>
            {activePlan?.price ?? '₹699'}/month · Renews {getSubscriptionRenewalLabel()}
          </Text>
        </Card>

        <Text style={styles.section}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((a) => (
            <Pressable
              key={a.label}
              style={styles.quickItem}
              onPress={() => {
                if (a.screen) {
                  setErrorMessage('');
                  if (!order || order.status === 'booked') {
                    setErrorMessage('Mark food ready first to start tracking.');
                    return;
                  }
                  if (order.status === 'pickup_closed') {
                    setErrorMessage('This delivery was cancelled.');
                    return;
                  }
                  if (!order.driver) {
                    setErrorMessage('Waiting for a driver to accept your pickup.');
                    return;
                  }
                  navigation.getParent()?.navigate('Track', { screen: 'Tracking' });
                } else if (a.tab) {
                  navigation.getParent()?.navigate(a.tab);
                } else if (a.route === 'Wallet') {
                  navigation.getParent()?.navigate('Profile', { screen: 'Wallet' });
                } else if (a.route === 'Referral') {
                  navigation.getParent()?.navigate('Profile', { screen: 'Referral' });
                }
              }}
            >
              <View style={[styles.quickIcon, { backgroundColor: a.bg }]}>
                <Ionicons name={a.icon} size={18} color={a.color} />
              </View>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Recent Deliveries</Text>
        {recentHistory.length > 0 ? (
          recentHistory.map((item) => (
            <DeliveryRow key={item.id} date={item.date} route={item.route} status={item.status} time={item.time} />
          ))
        ) : (
          <Card flat style={{ paddingVertical: 12 }}>
            <Text style={styles.emptyHistory}>Your completed deliveries will appear here.</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DeliveryRow({
  date,
  route,
  status,
  time,
}: {
  date: string;
  route: string;
  status: string;
  time: string;
}) {
  return (
    <Card flat style={{ paddingVertical: 12 }}>
      <View style={styles.deliveryRow}>
        <View style={styles.deliveryInfo}>
          <Text style={styles.deliveryDate}>{date}</Text>
          <Text style={styles.muted} numberOfLines={2}>
            {route}
          </Text>
        </View>
        <View style={styles.deliveryMeta}>
          <Badge label={status} tone={status === 'Delivered' ? 'green' : status === 'Cancelled' ? 'red' : 'orange'} />
          <Text style={[styles.muted, { marginTop: 4, fontSize: 11 }]}>{time}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  headerText: { flex: 1, minWidth: 0, marginRight: 12 },
  name: { fontSize: 20, fontWeight: '800' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingTop: spacing.md, paddingBottom: 32, flexGrow: 1 },
  statusCard: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  muted: { fontSize: 12, color: colors.muted },
  eta: { fontSize: 28, fontWeight: '800', color: colors.orange, textAlign: 'center', marginTop: 8 },
  cancelledEta: { color: colors.text, fontSize: 24 },
  etaLabel: { textAlign: 'center', fontSize: 12, color: colors.muted },
  foodReady: {
    backgroundColor: colors.orange,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  foodReadyDisabled: { opacity: 0.7 },
  error: { color: colors.red, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  foodReadyLabel: { color: colors.onPrimary, fontSize: 16, fontWeight: '800', marginTop: 8 },
  foodReadySub: { color: colors.onPrimary, fontSize: 11, opacity: 0.85, marginTop: 4, textAlign: 'center', paddingHorizontal: 12 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  driverInfo: { flex: 1, minWidth: 0 },
  driverName: { fontWeight: '700', fontSize: 15 },
  subText: { fontSize: 14, fontWeight: '600' },
  section: { fontSize: 16, fontWeight: '800', marginVertical: 12 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  quickItem: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 72,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickLabel: { fontSize: 10, fontWeight: '600', color: colors.muted, textAlign: 'center' },
  deliveryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  deliveryInfo: { flex: 1, minWidth: 0 },
  deliveryMeta: { alignItems: 'flex-end' },
  deliveryDate: { fontWeight: '700', fontSize: 14 },
  emptyHistory: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});
