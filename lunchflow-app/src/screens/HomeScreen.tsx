import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { HomePromoBanner, type PromoAction } from '../components/HomePromoBanner';
import { colors, shadow, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useDelivery } from '../context/DeliveryContext';
import { useFoodReadyOverlay } from '../context/FoodReadyOverlayContext';
import { useResponsive } from '../hooks/useResponsive';
import { HomeStackParamList } from '../navigation/types';
import { DeliveryHistoryEntry, syncDeliveryHistory } from '../services/deliveryHistoryService';
import { listCustomerOrders, loadCustomerProfile } from '../services/orderHubService';
import { loadFoodReadyDefaults } from '../services/foodReadyDefaultsService';
import { getStatusBadgeTone, getStatusLabel } from '../services/orderHubService';
import { loadActiveSubscription, checkSubscriptionRenewalReminders } from '../services/subscriptionService';
import { SubscriptionPlan } from '../constants/subscriptions';
import { DeliveryProfile, DeliveryOrder, FoodReadyDetails, getDropAddress, normalizeDeliveryType, normalizeDeliveryTypes, buildFoodReadyStudents } from '../types/delivery';
import { getSubscriptionRenewalLabel } from '../utils/date';
import { callDriver } from '../utils/phoneCall';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeMain'>;

const FOOD_READY_FORM_STATUSES = new Set(['booked', 'food_ready', 'awaiting_driver']);

type QuickAction = {
  id: 'track' | 'book' | 'subscription' | 'wallet';
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
};

const quickActions: QuickAction[] = [
  { id: 'track', icon: 'navigate', label: 'Track Live', color: colors.orange },
  { id: 'book', icon: 'briefcase', label: 'Book\nDelivery', color: '#F97316' },
  { id: 'subscription', icon: 'calendar', label: 'Subscription', color: '#2563EB' },
  { id: 'wallet', icon: 'wallet', label: 'Wallet', color: '#7C3AED' },
];

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { order, submitting, markFoodReady, refreshDelivery } = useDelivery();
  const { openFoodReadyDialog } = useFoodReadyOverlay();
  const { foodReadySize, horizontalPadding, width: screenWidth } = useResponsive();
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
    (profile?: DeliveryProfile): Partial<FoodReadyDetails> => {
      const personValue = order?.studentName || profile?.studentName || '';
      const dropValue = (order ? getDropAddress(order) : '') || profile?.school || '';
      const students = buildFoodReadyStudents({
        students: order?.studentEntries,
        studentEntries: order?.studentEntries,
        person: personValue,
        dropAddress: dropValue,
        deliveryType: normalizeDeliveryType(order?.deliveryType),
        deliveryTypes: order?.deliveryTypes,
      });
      return {
        name: user?.name || profile?.name || '',
        deliveryType: normalizeDeliveryType(order?.deliveryType),
        deliveryTypes: normalizeDeliveryTypes(order?.deliveryTypes, normalizeDeliveryType(order?.deliveryType)),
        pickupAddress: order?.pickupAddress || profile?.address || '',
        dropAddress: dropValue,
        person: personValue,
        students,
      };
    },
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

  const handleFoodReady = async () => {
    if (order?.status === 'pickup_closed') {
      goToFoodReady();
      return;
    }

    const showForm = !order || FOOD_READY_FORM_STATUSES.has(order.status);
    if (!showForm) {
      goToFoodReady();
      return;
    }

    if (!user?.phone) return;

    setErrorMessage('');

    const [savedDefaults, profile] = await Promise.all([
      loadFoodReadyDefaults(user.phone),
      loadCustomerProfile(user.phone),
    ]);

    if (savedDefaults) {
      openFoodReadyDialog({
        initialValues: savedDefaults,
        startInReviewMode: true,
        submitting,
        onConfirm: handleConfirmFoodReady,
      });
      return;
    }

    openFoodReadyDialog({
      initialValues: buildFoodReadyDefaults(profile),
      startInReviewMode: false,
      submitting,
      onConfirm: handleConfirmFoodReady,
    });
  };

  const isOrderCancelled = order?.status === 'pickup_closed';
  const statusLabel = order ? getStatusLabel(order.status) : 'Pending';
  const statusTone = order ? getStatusBadgeTone(order.status) : 'orange';
  const todayDeliveryTime = getTodayDeliveryTime(order);
  const showDriverStatus = Boolean(
    order && order.status !== 'booked' && order.status !== 'delivered' && !isOrderCancelled,
  );

  const foodReadyButtonSize = Math.min(foodReadySize, 156);
  const promoWidth = screenWidth - horizontalPadding * 2;

  const goToTracking = useCallback(() => {
    const tabNavigation = navigation.getParent();
    if (!tabNavigation) return;

    tabNavigation.dispatch(
      CommonActions.navigate({
        name: 'Track',
        params: { screen: 'Tracking' },
      }),
    );
  }, [navigation]);

  const handleQuickAction = useCallback(
    (action: QuickAction['id']) => {
      if (action === 'track') {
        setErrorMessage('');
        if (!order || order.status === 'booked') {
          setErrorMessage('Mark food ready first to start tracking.');
          return;
        }
        goToTracking();
        return;
      }

      if (action === 'book') {
        void handleFoodReady();
        return;
      }

      if (action === 'subscription') {
        navigation.getParent()?.navigate('Profile', { screen: 'Subscription' });
        return;
      }

      navigation.getParent()?.navigate('Profile', { screen: 'Wallet' });
    },
    [navigation, order, handleFoodReady, goToTracking],
  );

  const handlePromoAction = useCallback(
    (action: PromoAction) => {
      if (action === 'subscription' || action === 'track') {
        navigation.getParent()?.navigate('Profile', { screen: 'Subscription' });
        return;
      }
      navigation.getParent()?.navigate('Profile', { screen: 'Referral' });
    },
    [navigation],
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
      <View style={styles.body}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: horizontalPadding }]}
          showsVerticalScrollIndicator={false}
          bounces
        >
          <TodayDeliveryRow status={statusLabel} tone={statusTone} time={todayDeliveryTime} />

          <View style={styles.promoWrap}>
            <HomePromoBanner width={promoWidth} onAction={handlePromoAction} />
          </View>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

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
            </Card>
          ) : null}

          <View style={styles.foodReadyWrap}>
            <Pressable
              style={[
                styles.foodReady,
                {
                  width: foodReadyButtonSize,
                  height: foodReadyButtonSize,
                  borderRadius: foodReadyButtonSize / 2,
                },
                submitting && styles.foodReadyDisabled,
              ]}
              onPress={handleFoodReady}
              disabled={submitting}
              accessibilityRole="button"
            >
              <Ionicons name="fast-food" size={34} color={colors.white} />
              <Text style={styles.foodReadyLabel}>Food Ready</Text>
              <Text style={styles.foodReadySub}>Tap when lunch is packed</Text>
            </Pressable>
          </View>

          <Card flat title="Active Subscription" badge={<Badge label={activePlan?.badgeLabel ?? 'Student · 1M'} tone="green" />}>
            <Text style={styles.subText}>
              {activePlan?.price ?? '₹699'}/month · Renews {getSubscriptionRenewalLabel()}
            </Text>
          </Card>

          <Text style={styles.section}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <Pressable
                key={action.id}
                style={styles.quickItem}
                onPress={() => handleQuickAction(action.id)}
              >
                <Ionicons name={action.icon} size={28} color={action.color} />
                <Text style={styles.quickLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.section}>Recent Deliveries</Text>
          {recentHistory.length > 0 ? (
            recentHistory.map((item) => (
              <DeliveryRow key={item.id} date={item.date} status={item.status} time={item.time} />
            ))
          ) : (
            <Card flat style={{ paddingVertical: 12 }}>
              <Text style={styles.emptyHistory}>Your completed deliveries will appear here.</Text>
            </Card>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function getTodayDeliveryTime(order: DeliveryOrder | null): string | null {
  if (!order) return null;
  return order.deliveredAt ?? order.pickedUpAt ?? order.foodReadyAt ?? order.bookedAt ?? null;
}

function TodayDeliveryRow({
  status,
  tone,
  time,
}: {
  status: string;
  tone: 'orange' | 'green' | 'blue' | 'red';
  time: string | null;
}) {
  return (
    <LinearGradient
      colors={['#FFF5F9', '#FFFFFF', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.todayDeliveryCard}
    >
      <View style={styles.deliveryRow}>
        <View style={styles.deliveryInfo}>
          <Text style={styles.todayDeliveryTitle}>Today&apos;s Delivery</Text>
        </View>
        <View style={styles.deliveryMeta}>
          <Badge label={status} tone={tone} />
          {time ? <Text style={styles.deliveryTime}>{time}</Text> : null}
        </View>
      </View>
    </LinearGradient>
  );
}

function DeliveryRow({
  date,
  status,
  time,
}: {
  date: string;
  status: string;
  time: string;
}) {
  return (
    <Card flat style={{ paddingVertical: 12 }}>
      <View style={styles.deliveryRow}>
        <View style={styles.deliveryInfo}>
          <Text style={styles.deliveryDate}>{date}</Text>
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
  scroll: { flex: 1 },
  scrollContent: { paddingTop: spacing.md, paddingBottom: 32, flexGrow: 1 },
  body: { flex: 1 },
  foodReadyWrap: {
    width: '100%',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  todayDeliveryCard: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(233, 30, 99, 0.07)',
    ...shadow.subtle,
  },
  todayDeliveryTitle: { fontWeight: '800', fontSize: 15, color: colors.text },
  promoWrap: { width: '100%', alignItems: 'center' },
  muted: { fontSize: 12, color: colors.muted },
  deliveryTime: { fontSize: 11, color: colors.muted, marginTop: 4 },
  foodReady: {
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
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
  section: { fontSize: 16, fontWeight: '800', marginTop: 12, marginBottom: 12 },
  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  quickItem: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 96,
    gap: 10,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 15,
  },
  deliveryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  deliveryInfo: { flex: 1, minWidth: 0 },
  deliveryMeta: { alignItems: 'flex-end' },
  deliveryDate: { fontWeight: '700', fontSize: 14 },
  emptyHistory: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});
