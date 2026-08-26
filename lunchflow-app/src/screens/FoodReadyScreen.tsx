import { Ionicons } from '@expo/vector-icons';
import { CommonActions, RouteProp, useFocusEffect, useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { PickupPlanSection } from '../components/PickupPlanSection';
import { colors, gradients, shadow, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useDelivery } from '../context/DeliveryContext';
import { useFoodReadyOverlay } from '../context/FoodReadyOverlayContext';
import { useResponsive } from '../hooks/useResponsive';
import { HomeStackParamList } from '../navigation/types';
import { loadFoodReadyDefaults } from '../services/foodReadyDefaultsService';
import { loadCustomerProfile } from '../services/orderHubService';
import { hasActiveSubscription } from '../services/subscriptionService';
import { clearPendingFoodReady, loadPendingFoodReady } from '../services/pendingFoodReadyService';
import { blockPickupOutsideAreaSlot } from '../utils/pickupSlotGuard';
import {
  buildFoodReadyStudents,
  DeliveryOrder,
  getDropAddress,
  getDeliveryTypeLabel,
  hasSentPickupRequest,
  normalizeDeliveryType,
  normalizeDeliveryTypes,
} from '../types/delivery';

type Props = NativeStackScreenProps<HomeStackParamList, 'FoodReady'>;
type FoodReadyRoute = RouteProp<HomeStackParamList, 'FoodReady'>;

function ScreenBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
      <Ionicons name="arrow-back" size={20} color={colors.text} />
    </Pressable>
  );
}

function formatDropDetails(order: Pick<DeliveryOrder, 'studentName' | 'dropAddress' | 'school' | 'studentEntries'>): string {
  const students = order.studentEntries?.filter(
    (entry) => entry.name.trim() || entry.dropLocation.trim() || entry.classSection.trim(),
  );

  if (students && students.length > 0) {
    return students
      .map((entry) => {
        const parts = [entry.name.trim(), entry.classSection.trim(), entry.dropLocation.trim()].filter(Boolean);
        return parts.join(' · ');
      })
      .join(' | ');
  }

  const address = getDropAddress(order);
  const name = order.studentName?.trim();
  if (!name) return address;
  if (address && address !== name) return `${name} · ${address}`;
  return name;
}

const LUNCH_BAG = require('../../assets/lunch-bag.png');

function SuccessHero({
  title,
  subtitle,
  loading,
  tone = 'success',
}: {
  title: string;
  subtitle: string;
  loading?: boolean;
  tone?: 'success' | 'cancelled';
}) {
  const isCancelled = tone === 'cancelled';

  return (
    <View style={styles.hero}>
      <View style={[styles.heroRingOuter, isCancelled && styles.heroRingCancelled]}>
        <View style={[styles.heroRingMid, isCancelled && styles.heroRingMidCancelled]}>
          <View style={[styles.heroRingCore, isCancelled && styles.heroRingCoreCancelled]}>
            {isCancelled ? (
              <Ionicons name="close" size={36} color={colors.red} />
            ) : (
              <>
                <Image source={LUNCH_BAG} style={styles.heroLunchBag} resizeMode="contain" accessibilityLabel="Lunch box" />
                {loading ? (
                  <View style={styles.heroSpinner}>
                    <ActivityIndicator size="small" color={colors.orange} />
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>
      </View>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </View>
  );
}

function RouteCard({
  pickup,
  drop,
  typeLabel,
}: {
  pickup: string;
  drop: string;
  typeLabel: string;
}) {
  return (
    <View style={styles.routeCard}>
      <View style={styles.routeCardHeader}>
        <Text style={styles.routeCardTitle}>Delivery Route</Text>
        <View style={styles.typePill}>
          <Text style={styles.typePillText}>{typeLabel}</Text>
        </View>
      </View>

      <View style={styles.routeTimeline}>
        <View style={styles.routePoint}>
          <View style={[styles.routeDot, styles.routeDotPickup]} />
          <View style={styles.routeCopy}>
            <Text style={styles.routeLabel}>PICKUP</Text>
            <Text style={styles.routeValue}>{pickup}</Text>
          </View>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.routePoint}>
          <View style={[styles.routeDot, styles.routeDotDrop]} />
          <View style={styles.routeCopy}>
            <Text style={styles.routeLabel}>DROP</Text>
            <Text style={styles.routeValue}>{drop}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function DriverStatusCard({
  hasDriver,
  driverName,
  driverInitials,
  etaMinutes,
}: {
  hasDriver: boolean;
  driverName?: string;
  driverInitials?: string;
  etaMinutes?: number | null;
}) {
  return (
    <LinearGradient colors={[...gradients.premium]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.driverCard}>
      <View style={styles.driverCardHeader}>
        <Text style={styles.driverCardTitle}>Driver Status</Text>
        <View style={[styles.driverBadge, hasDriver ? styles.driverBadgeLive : styles.driverBadgePending]}>
          <View style={[styles.driverBadgeDot, hasDriver ? styles.driverBadgeDotLive : styles.driverBadgeDotPending]} />
          <Text style={[styles.driverBadgeText, hasDriver ? styles.driverBadgeTextLive : styles.driverBadgeTextPending]}>
            {hasDriver ? 'Assigned' : 'Pending'}
          </Text>
        </View>
      </View>

      <View style={styles.driverMain}>
        {hasDriver ? (
          <Avatar initials={driverInitials ?? '—'} onDark />
        ) : (
          <View style={styles.searchOrb}>
            <View style={styles.searchOrbMid}>
              <Ionicons name="search" size={22} color={colors.orange} />
            </View>
          </View>
        )}
        <View style={styles.driverCopy}>
          <Text style={styles.driverName}>{hasDriver ? driverName : 'Finding your rider'}</Text>
          <Text style={styles.driverSub}>
            {hasDriver
              ? etaMinutes
                ? `Arriving in ${etaMinutes} minutes`
                : 'Rider confirmed for pickup'
              : 'We are matching the nearest available driver'}
          </Text>
        </View>
      </View>

      <View style={styles.driverStats}>
        <View style={styles.driverStat}>
          <Text style={styles.driverStatLabel}>PICKUP ETA</Text>
          <Text style={styles.driverStatValue}>{etaMinutes != null ? `${etaMinutes} min` : '—'}</Text>
        </View>
        <View style={styles.driverStatDivider} />
        <View style={styles.driverStat}>
          <Text style={styles.driverStatLabel}>STATUS</Text>
          <Text style={[styles.driverStatValue, styles.driverStatValueSmall]}>{hasDriver ? 'On Route' : 'Pending'}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

export function FoodReadyScreen({ navigation }: Props) {
  const route = useRoute<FoodReadyRoute>();
  const choosePlanStep = route.params?.step === 'choosePlan';
  const peopleCount = Math.max(1, route.params?.peopleCount ?? 1);
  const { user } = useAuth();
  const { order, submitting, markFoodReady, refreshDelivery } = useDelivery();
  const { openFoodReadyDialog, closeFoodReadyDialog } = useFoodReadyOverlay();
  const { horizontalPadding, contentMaxWidth } = useResponsive();
  const [planReady, setPlanReady] = useState(!choosePlanStep);
  const displayOrder = order;
  const hasDriver = Boolean(displayOrder?.driver);
  const isWaiting = displayOrder?.status === 'awaiting_driver';
  const etaLabel = displayOrder?.driver?.etaMinutes ?? null;

  const openPickupDialog = useCallback(async () => {
    if (!user?.phone) return;

    const profile = await loadCustomerProfile(user.phone);
    const pickupAddress = order?.pickupAddress || profile.address || '';
    if (await blockPickupOutsideAreaSlot(pickupAddress)) return;

    if (hasSentPickupRequest(order)) {
      Alert.alert(
        'Pickup request already sent',
        'You already sent a pickup request. Please wait for a rider to accept.',
      );
      return;
    }

    const [savedDefaults] = await Promise.all([
      loadFoodReadyDefaults(user.phone),
    ]);

    const openDialog = (initialValues: Parameters<typeof openFoodReadyDialog>[0]['initialValues']) => {
      openFoodReadyDialog({
        initialValues,
        submitting,
        onConfirm: async (details) => {
          await markFoodReady(details);
          await refreshDelivery();
        },
      });
    };

    if (savedDefaults) {
      openDialog(savedDefaults);
      return;
    }

    openDialog({
      name: user.name || profile.name || '',
      deliveryType: normalizeDeliveryType(profile.deliveryType),
      pickupAddress: profile.address || '',
      dropAddress: profile.school || '',
      person: profile.studentName || '',
      students: buildFoodReadyStudents({
        person: profile.studentName,
        dropAddress: profile.school,
        deliveryType: normalizeDeliveryType(profile.deliveryType),
      }),
    });
  }, [user, order, submitting, openFoodReadyDialog, markFoodReady, refreshDelivery]);

  const handlePlanReady = useCallback(async () => {
    if (!user?.phone) return;

    const pending = await loadPendingFoodReady(user.phone);
    if (pending) {
      const result = await markFoodReady(pending);
      await clearPendingFoodReady(user.phone);
      await refreshDelivery();
      if (result.error) {
        Alert.alert('Pickup request failed', result.error);
        return;
      }
    } else {
      await refreshDelivery();
    }

    closeFoodReadyDialog();
    setPlanReady(true);
    navigation.setParams({ step: undefined, peopleCount: undefined });
  }, [user?.phone, markFoodReady, refreshDelivery, closeFoodReadyDialog, navigation]);

  useEffect(() => {
    if (!choosePlanStep) return;
    setPlanReady(false);
  }, [choosePlanStep]);

  useEffect(() => {
    void refreshDelivery();
    const interval = setInterval(() => void refreshDelivery(), 3000);
    return () => clearInterval(interval);
  }, [refreshDelivery]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.phone || choosePlanStep) return;
      void hasActiveSubscription(user.phone).then((has) => {
        if (has) setPlanReady(true);
      });
    }, [user?.phone, choosePlanStep]),
  );

  const goToTracking = () => {
    navigation.getParent()?.dispatch(
      CommonActions.navigate({
        name: 'Track',
        params: { screen: 'Tracking' },
      }),
    );
  };

  const openEditDialog = () => {
    if (!displayOrder) return;
    openFoodReadyDialog({
      initialValues: {
        name: displayOrder.customerName,
        deliveryType: normalizeDeliveryType(displayOrder.deliveryType),
        deliveryTypes: normalizeDeliveryTypes(
          displayOrder.deliveryTypes,
          normalizeDeliveryType(displayOrder.deliveryType),
        ),
        pickupAddress: displayOrder.pickupAddress,
        dropAddress: getDropAddress(displayOrder),
        person: displayOrder.studentName,
        students: buildFoodReadyStudents({
          studentEntries: displayOrder.studentEntries,
          person: displayOrder.studentName,
          dropAddress: getDropAddress(displayOrder),
          deliveryType: normalizeDeliveryType(displayOrder.deliveryType),
          deliveryTypes: displayOrder.deliveryTypes,
        }),
      },
      submitting,
      allowUpdate: true,
      onConfirm: async (details) => {
        await markFoodReady(details);
        await refreshDelivery();
      },
    });
  };

  if (choosePlanStep && !planReady) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.topBar, { paddingHorizontal: horizontalPadding }]}>
          <ScreenBackButton onPress={() => navigation.goBack()} />
          <Text style={styles.pageTitle}>Upgrade Plan</Text>
          <View style={styles.topBarSpacer} />
        </View>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.body, { maxWidth: contentMaxWidth }]}>
            <Text style={styles.choosePlanHint}>
              You added {peopleCount} {peopleCount === 1 ? 'person' : 'people'}. Pay for extra seats to continue.
            </Text>
            <PickupPlanSection mode="picker" peopleCount={peopleCount} onPlanReady={() => void handlePlanReady()} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (choosePlanStep && planReady && (!displayOrder || displayOrder.status === 'booked')) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.topBar, { paddingHorizontal: horizontalPadding }]}>
          <ScreenBackButton onPress={() => navigation.goBack()} />
          <Text style={styles.pageTitle}>Pickup Request</Text>
          <View style={styles.topBarSpacer} />
        </View>
        <View style={[styles.emptyState, { paddingHorizontal: horizontalPadding }]}>
          <ActivityIndicator size="large" color={colors.orange} />
          <Text style={styles.emptySub}>Creating your pickup request…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!displayOrder || displayOrder.status === 'booked') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.topBar, { paddingHorizontal: horizontalPadding }]}>
          <ScreenBackButton onPress={() => navigation.goBack()} />
          <Text style={styles.pageTitle}>Pickup Request</Text>
          <View style={styles.topBarSpacer} />
        </View>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.body, { maxWidth: contentMaxWidth }]}>
            <PickupPlanSection mode="picker" peopleCount={peopleCount} onPlanReady={() => setPlanReady(true)} />
            {planReady ? (
              <>
                <LinearGradient colors={['#FFF5F9', '#FFFFFF']} style={styles.emptyCard}>
                  <Ionicons name="location-outline" size={42} color={colors.orange} />
                  <Text style={styles.emptyTitle}>Set your drop address</Text>
                  <Text style={styles.emptySub}>Confirm pickup and drop details to create your request.</Text>
                </LinearGradient>
                <Button title="Set Drop Address" onPress={() => void openPickupDialog()} style={styles.fullWidthBtn} />
              </>
            ) : null}
            <Button title="Back to Home" variant="outline" onPress={() => navigation.goBack()} style={styles.fullWidthBtn} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (displayOrder.status === 'pickup_closed') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={[styles.topBar, { paddingHorizontal: horizontalPadding }]}>
          <ScreenBackButton onPress={() => navigation.goBack()} />
        </View>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.body, { maxWidth: contentMaxWidth }]}>
            <SuccessHero title="Order Cancelled" subtitle="This delivery is no longer active" tone="cancelled" />
            <RouteCard
              pickup={displayOrder.pickupAddress}
              drop={formatDropDetails(displayOrder)}
              typeLabel="Cancelled"
            />
            <View style={styles.actions}>
              <Button title="Track Live" onPress={goToTracking} style={styles.fullWidthBtn} />
              <Button title="Back to Home" variant="outline" onPress={() => navigation.goBack()} style={styles.fullWidthBtn} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[colors.bg, colors.bg]} style={styles.topGlow}>
        <View style={[styles.topBar, { paddingHorizontal: horizontalPadding }]}>
          <ScreenBackButton onPress={() => navigation.goBack()} />
          <View style={styles.requestPill}>
            <Text style={styles.requestPillText}>#{displayOrder.id.slice(-6).toUpperCase()}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.body, { maxWidth: contentMaxWidth }]}>
          <PickupPlanSection mode="status" />

          <SuccessHero
            title="Pickup Request Created!"
            subtitle="Your lunchbox is ready for pickup"
            loading={isWaiting && !hasDriver}
          />

          <RouteCard
            pickup={displayOrder.pickupAddress}
            drop={formatDropDetails(displayOrder)}
            typeLabel={getDeliveryTypeLabel(displayOrder.deliveryType)}
          />

          <DriverStatusCard
            hasDriver={hasDriver}
            driverName={displayOrder.driver?.name}
            driverInitials={displayOrder.driver?.initials}
            etaMinutes={etaLabel}
          />

          <View style={styles.actions}>
            {isWaiting && !hasDriver ? (
              <Pressable style={styles.outlineAction} onPress={openEditDialog}>
                <Ionicons name="create-outline" size={18} color={colors.orange} />
                <Text style={styles.outlineActionText}>Edit Delivery Details</Text>
              </Pressable>
            ) : null}

            <Pressable style={[styles.primaryAction, !hasDriver && styles.primaryActionMuted]} onPress={goToTracking}>
              <Ionicons name="navigate" size={18} color={colors.onPrimary} />
              <Text style={styles.primaryActionText}>Track Live Delivery</Text>
            </Pressable>

            <Pressable style={styles.ghostAction} onPress={() => navigation.goBack()}>
              <Text style={styles.ghostActionText}>Back to Home</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topGlow: { paddingBottom: spacing.xs },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  topBarSpacer: { width: 40 },
  requestPill: {
    backgroundColor: colors.white,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  requestPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 0.5,
  },
  scroll: {
    paddingBottom: spacing.xl * 2,
    alignItems: 'center',
  },
  body: {
    width: '100%',
    alignSelf: 'center',
  },
  choosePlanHint: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyCard: {
    borderRadius: 22,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadow.subtle,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  heroRingOuter: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 2,
    borderColor: 'rgba(228,94,26,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroRingCancelled: {
    borderColor: 'rgba(198,40,40,0.2)',
  },
  heroRingMid: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 2,
    borderColor: 'rgba(228,94,26,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroRingMidCancelled: {
    borderColor: 'rgba(198,40,40,0.28)',
  },
  heroRingCore: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroLunchBag: {
    width: 88,
    height: 88,
  },
  heroSpinner: {
    position: 'absolute',
    bottom: 8,
  },
  heroRingCoreCancelled: {
    backgroundColor: colors.redLight,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  routeCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.subtle,
  },
  routeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: 8,
  },
  routeCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  typePill: {
    backgroundColor: colors.purpleLight,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.purple,
  },
  routeTimeline: {
    gap: 0,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  routeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
  },
  routeDotPickup: { backgroundColor: colors.orange },
  routeDotDrop: { backgroundColor: colors.green },
  routeLine: {
    width: 2,
    height: 22,
    backgroundColor: colors.border,
    marginLeft: 6,
    marginVertical: 4,
  },
  routeCopy: { flex: 1, minWidth: 0 },
  routeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.5,
  },
  routeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 4,
    lineHeight: 19,
  },
  driverCard: {
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  driverCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  driverCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.onPrimary,
  },
  driverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  driverBadgeLive: { backgroundColor: 'rgba(67,160,71,0.2)' },
  driverBadgePending: { backgroundColor: 'rgba(228,94,26,0.22)' },
  driverBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  driverBadgeDotLive: { backgroundColor: colors.green },
  driverBadgeDotPending: { backgroundColor: colors.orange },
  driverBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  driverBadgeTextLive: { color: colors.green },
  driverBadgeTextPending: { color: colors.orange },
  driverMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  searchOrb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(228,94,26,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  searchOrbMid: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverCopy: { flex: 1, minWidth: 0 },
  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.onPrimary,
  },
  driverSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
    lineHeight: 17,
  },
  driverStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  driverStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  driverStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  driverStatLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 0.5,
  },
  driverStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.onPrimary,
    marginTop: 4,
  },
  driverStatValueSmall: {
    fontSize: 14,
    fontWeight: '800',
  },
  actions: {
    width: '100%',
    gap: 10,
    marginTop: spacing.xs,
  },
  outlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.orange,
    paddingVertical: 14,
  },
  outlineActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.orange,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.orange,
    borderRadius: 14,
    paddingVertical: 15,
    ...shadow.subtle,
  },
  primaryActionMuted: {
    backgroundColor: colors.orangeDark,
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.onPrimary,
  },
  ghostAction: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  ghostActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
  },
  fullWidthBtn: {
    width: '100%',
  },
});
