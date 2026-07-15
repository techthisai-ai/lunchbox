import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { LiveDeliveryMap } from '../components/LiveDeliveryMap';
import { PickupVerificationModal } from '../components/PickupVerificationModal';
import { colors, shadow, spacing } from '../constants/theme';
import { useDelivery } from '../context/DeliveryContext';
import { useLiveEta } from '../hooks/useLiveEta';
import { useResponsive } from '../hooks/useResponsive';
import { TrackStackParamList } from '../navigation/types';
import { getStatusLabel, syncDriverLocationForOrder } from '../services/orderHubService';
import { DeliveryOrder, DeliveryStatus, getDropAddress } from '../types/delivery';
import { callDriver } from '../utils/phoneCall';

type Props = NativeStackScreenProps<TrackStackParamList, 'Tracking'>;

const TRACK_STEPS: { key: DeliveryStatus[]; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: ['driver_assigned', 'at_pickup', 'pickup_verified'], label: 'Assigned', icon: 'bicycle-outline' },
  { key: ['picked_up'], label: 'Pickup', icon: 'bag-check-outline' },
  { key: ['in_transit', 'at_drop'], label: 'Transit', icon: 'navigate-outline' },
  { key: ['delivered'], label: 'Done', icon: 'checkmark-circle-outline' },
];

function getTrackingStatusMessage(status: DeliveryStatus): string {
  switch (status) {
    case 'at_drop':
      return 'Driver has arrived at drop point';
    case 'picked_up':
    case 'in_transit':
      return 'Your lunchbox is on the move';
    case 'at_pickup':
    case 'pickup_verified':
      return 'Driver is at pickup location';
    case 'driver_assigned':
      return 'Rider is heading to you';
    case 'delivered':
      return 'Lunchbox delivered successfully';
    default:
      return 'Live tracking is active';
  }
}

function shortenLocation(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  const first = trimmed.split(',')[0]?.trim();
  return first && first.length <= 28 ? first : `${trimmed.slice(0, 26)}…`;
}

function getActiveStepIndex(status: DeliveryStatus): number {
  if (status === 'delivered') return 3;
  if (status === 'in_transit' || status === 'at_drop') return 2;
  if (status === 'picked_up') return 1;
  if (['driver_assigned', 'at_pickup', 'pickup_verified', 'food_ready', 'awaiting_driver'].includes(status)) return 0;
  return -1;
}

function TrackingProgressBar({ status }: { status: DeliveryStatus }) {
  const activeIndex = getActiveStepIndex(status);

  return (
    <View style={styles.progressWrap}>
      {TRACK_STEPS.map((step, index) => {
        const isDone = activeIndex > index;
        const isActive = activeIndex === index;
        const tone = isDone ? colors.green : isActive ? colors.orange : colors.border;

        return (
          <View key={step.label} style={styles.progressStep}>
            <View style={[styles.progressNode, { borderColor: tone, backgroundColor: isDone || isActive ? tone : colors.white }]}>
              <Ionicons
                name={step.icon}
                size={14}
                color={isDone || isActive ? colors.onPrimary : colors.muted}
              />
            </View>
            <Text style={[styles.progressLabel, (isDone || isActive) && styles.progressLabelActive]}>{step.label}</Text>
            {index < TRACK_STEPS.length - 1 ? (
              <View style={[styles.progressLine, { backgroundColor: activeIndex > index ? colors.green : colors.border }]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function RouteStrip({ order }: { order: DeliveryOrder }) {
  const pickup = shortenLocation(order.pickupAddress, 'Home');
  const drop = shortenLocation(getDropAddress(order), 'Drop');

  return (
    <View style={styles.routeCard}>
      <View style={styles.routePoint}>
        <View style={[styles.routeDot, styles.routeDotPickup]} />
        <View style={styles.routeCopy}>
          <Text style={styles.routeLabel}>PICKUP</Text>
          <Text style={styles.routeValue} numberOfLines={1}>
            {pickup}
          </Text>
        </View>
      </View>

      <View style={styles.routeConnector}>
        <View style={styles.routeDash} />
        <Ionicons name="arrow-forward" size={14} color={colors.muted} />
        <View style={styles.routeDash} />
      </View>

      <View style={styles.routePoint}>
        <View style={[styles.routeDot, styles.routeDotDrop]} />
        <View style={styles.routeCopy}>
          <Text style={styles.routeLabel}>DROP</Text>
          <Text style={styles.routeValue} numberOfLines={1}>
            {drop}
          </Text>
        </View>
      </View>
    </View>
  );
}

function TrackingHeader({
  horizontalPadding,
  refreshing,
  onBack,
  onRefresh,
  live,
}: {
  horizontalPadding: number;
  refreshing: boolean;
  onBack: () => void;
  onRefresh: () => void;
  live?: boolean;
}) {
  return (
    <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
      <Pressable onPress={onBack} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Go back">
        <Ionicons name="arrow-back" size={22} color={colors.onPrimary} />
      </Pressable>

      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>Live Tracking</Text>
        {live ? (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={onRefresh}
        style={styles.headerBtn}
        disabled={refreshing}
        accessibilityRole="button"
        accessibilityLabel="Refresh tracking"
      >
        {refreshing ? (
          <ActivityIndicator size="small" color={colors.onPrimary} />
        ) : (
          <Ionicons name="refresh" size={22} color={colors.onPrimary} />
        )}
      </Pressable>
    </View>
  );
}

function FindingDriverState({
  horizontalPadding,
  refreshing,
  status,
  onBack,
  onRefresh,
}: {
  horizontalPadding: number;
  refreshing: boolean;
  status: DeliveryStatus;
  onBack: () => void;
  onRefresh: () => void;
}) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TrackingHeader
        horizontalPadding={horizontalPadding}
        refreshing={refreshing}
        onBack={onBack}
        onRefresh={onRefresh}
      />
      <View style={styles.findingWrap}>
        <LinearGradient colors={['#2D2D44', '#3D3D5C']} style={styles.findingCard}>
          <View style={styles.radarRing}>
            <View style={styles.radarRingMid}>
              <View style={styles.radarCore}>
                <ActivityIndicator size="large" color={colors.orange} />
              </View>
            </View>
          </View>
          <Text style={styles.findingTitle}>Finding your rider</Text>
          <Text style={styles.findingSub}>Your pickup request is live. We are matching the nearest available driver.</Text>
          <View style={styles.findingStatus}>
            <Text style={styles.findingStatusText}>{getStatusLabel(status)}</Text>
          </View>
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
}

export function TrackingScreen({ navigation }: Props) {
  const { order, refreshDelivery } = useDelivery();
  const { horizontalPadding } = useResponsive();
  const liveEtaMinutes = useLiveEta(order);
  const [refreshing, setRefreshing] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);
    try {
      if (order?.id && order.driver) {
        await syncDriverLocationForOrder(order.id);
      }
      await refreshDelivery({ force: true });
      setMapKey((key) => key + 1);
    } finally {
      setRefreshing(false);
    }
  }, [order?.id, order?.driver, refreshDelivery, refreshing]);

  useFocusEffect(
    useCallback(() => {
      if (!order?.id || !order.driver) return undefined;

      const syncLiveTracking = () => {
        void syncDriverLocationForOrder(order.id).then(() => refreshDelivery());
      };

      syncLiveTracking();
      const interval = setInterval(syncLiveTracking, 10000);
      return () => clearInterval(interval);
    }, [order?.id, order?.driver, refreshDelivery]),
  );

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.getParent()?.navigate('Home');
  };

  if (!order || order.status === 'booked') {
    return (
      <SafeAreaView style={styles.emptyScreen} edges={['top']}>
        <LinearGradient colors={['#2D2D44', '#1F1F33']} style={styles.emptyHero}>
          <Ionicons name="navigate-circle-outline" size={56} color="rgba(255,255,255,0.35)" />
          <Text style={styles.emptyTitle}>Tracking not started</Text>
          <Text style={styles.emptySub}>Mark food ready from Home to unlock live rider tracking.</Text>
        </LinearGradient>
        <View style={styles.emptyBody}>
          <Button title="Back to Home" variant="outline" onPress={handleBack} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order.driver) {
    return (
      <FindingDriverState
        horizontalPadding={horizontalPadding}
        refreshing={refreshing}
        status={order.status}
        onBack={handleBack}
        onRefresh={() => void handleRefresh()}
      />
    );
  }

  const isInTransit = ['in_transit', 'at_drop', 'picked_up'].includes(order.status);
  const etaMinutes = liveEtaMinutes ?? (isInTransit ? 14 : 8);
  const statusMessage = getTrackingStatusMessage(order.status);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TrackingHeader
        horizontalPadding={horizontalPadding}
        refreshing={refreshing}
        onBack={handleBack}
        onRefresh={() => void handleRefresh()}
        live
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces>
        <View style={styles.mapBlock}>
          <LiveDeliveryMap key={mapKey} order={order} height={300} />
          <LinearGradient
            colors={['rgba(45,45,68,0.55)', 'rgba(45,45,68,0.05)', 'transparent']}
            style={styles.mapOverlay}
            pointerEvents="none"
          />

          <View style={styles.etaOrb}>
            <Text style={styles.etaOrbLabel}>ARRIVING IN</Text>
            <Text style={styles.etaOrbValue}>{etaMinutes}</Text>
            <Text style={styles.etaOrbUnit}>min</Text>
          </View>

          <View style={styles.mapStatusPill}>
            <Ionicons name="pulse" size={14} color={colors.orange} />
            <Text style={styles.mapStatusText} numberOfLines={1}>
              {statusMessage}
            </Text>
          </View>
        </View>

        <View style={[styles.sheet, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.sheetHandle} />

          <TrackingProgressBar status={order.status} />

          <RouteStrip order={order} />

          <View style={styles.driverCard}>
            <Avatar initials={order.driver.initials} />
            <View style={styles.driverCopy}>
              <Text style={styles.driverEyebrow}>YOUR RIDER</Text>
              <Text style={styles.driverName} numberOfLines={1}>
                {order.driver.name}
              </Text>
              <Text style={styles.driverStatus}>{getStatusLabel(order.status)}</Text>
            </View>
            <Pressable style={styles.driverAction} onPress={() => void callDriver(order)}>
              <Ionicons name="call" size={18} color={colors.onPrimary} />
            </Pressable>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.actionPill} onPress={() => navigation.navigate('DeliveryStatus')}>
              <Ionicons name="list-outline" size={16} color={colors.text} />
              <Text style={styles.actionPillText}>Full Status</Text>
            </Pressable>
            <Pressable style={styles.actionPill} onPress={() => setQrModalVisible(true)}>
              <Ionicons name="qr-code-outline" size={16} color={colors.text} />
              <Text style={styles.actionPillText}>QR & OTP</Text>
            </Pressable>
            <Pressable style={styles.actionPill} onPress={() => void handleRefresh()} disabled={refreshing}>
              <Ionicons name="locate-outline" size={16} color={colors.text} />
              <Text style={styles.actionPillText}>{refreshing ? 'Updating…' : 'Refresh'}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <PickupVerificationModal
        visible={qrModalVisible}
        order={order}
        onClose={() => setQrModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2D2D44' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    backgroundColor: '#2D2D44',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerCenter: { alignItems: 'center', gap: 4 },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.onPrimary,
    letterSpacing: -0.2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(67,160,71,0.18)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.green,
    letterSpacing: 0.8,
  },
  scroll: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: spacing.xl * 2 },
  mapBlock: {
    height: 300,
    backgroundColor: '#1F1F33',
    position: 'relative',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  etaOrb: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.lg,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.elevated,
  },
  etaOrbLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
  },
  etaOrbValue: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.orange,
    lineHeight: 32,
  },
  etaOrbUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
    marginTop: -2,
  },
  mapStatusPill: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    maxWidth: '52%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...shadow.subtle,
  },
  mapStatusText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -18,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingHorizontal: 4,
  },
  progressStep: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  progressNode: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    zIndex: 1,
  },
  progressLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
  },
  progressLabelActive: {
    color: colors.text,
    fontWeight: '800',
  },
  progressLine: {
    position: 'absolute',
    top: 14,
    left: '58%',
    right: '-42%',
    height: 2,
    zIndex: 0,
  },
  routeCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.subtle,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeDotPickup: { backgroundColor: colors.orange },
  routeDotDrop: { backgroundColor: colors.green },
  routeCopy: { flex: 1, minWidth: 0 },
  routeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
  },
  routeValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  routeConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingLeft: 2,
  },
  routeDash: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.subtle,
  },
  driverCopy: { flex: 1, minWidth: 0 },
  driverEyebrow: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.6,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  driverStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.orange,
    marginTop: 2,
  },
  driverAction: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  emptyScreen: { flex: 1, backgroundColor: colors.bg },
  emptyHero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onPrimary,
    marginTop: spacing.sm,
  },
  emptySub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 280,
  },
  emptyBody: {
    padding: spacing.lg,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  findingWrap: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  findingCard: {
    borderRadius: 24,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.elevated,
  },
  radarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(233,30,99,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  radarRingMid: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: 'rgba(233,30,99,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  findingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onPrimary,
    marginBottom: 8,
  },
  findingSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.md,
  },
  findingStatus: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  findingStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
