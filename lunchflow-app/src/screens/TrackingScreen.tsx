import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { LiveDeliveryMap } from '../components/LiveDeliveryMap';
import { Timeline } from '../components/Timeline';
import { colors, shadow, spacing } from '../constants/theme';
import { useDelivery } from '../context/DeliveryContext';
import { useLiveEta } from '../hooks/useLiveEta';
import { useResponsive } from '../hooks/useResponsive';
import { getStatusBadgeTone, getStatusLabel, getTrackingTimeline, syncDriverLocationForOrder } from '../services/orderHubService';
import { TrackStackParamList } from '../navigation/types';
import { DeliveryStatus } from '../types/delivery';
import { callDriver } from '../utils/phoneCall';

type Props = NativeStackScreenProps<TrackStackParamList, 'Tracking'>;

const STATUS_CARD_MAP_OVERLAP = 20;

function getTrackingStatusMessage(status: DeliveryStatus): string {
  switch (status) {
    case 'at_drop':
      return 'Driver has arrived';
    case 'picked_up':
    case 'in_transit':
      return 'Driver is arriving...';
    case 'at_pickup':
    case 'pickup_verified':
      return 'Driver is at pickup';
    case 'driver_assigned':
      return 'Driver is on the way...';
    default:
      return 'Tracking your delivery...';
  }
}

function TrackingHeader({
  horizontalPadding,
  refreshing,
  onBack,
  onRefresh,
}: {
  horizontalPadding: number;
  refreshing: boolean;
  onBack: () => void;
  onRefresh: () => void;
}) {
  return (
    <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
      <Pressable onPress={onBack} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Go back">
        <Ionicons name="arrow-back" size={22} color={colors.onPrimary} />
      </Pressable>
      <Text style={styles.headerTitle}>Live Tracking</Text>
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

export function TrackingScreen({ navigation }: Props) {
  const { order, refreshDelivery } = useDelivery();
  const { horizontalPadding } = useResponsive();
  const liveEtaMinutes = useLiveEta(order);
  const [refreshing, setRefreshing] = useState(false);
  const [mapKey, setMapKey] = useState(0);

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
      <SafeAreaView style={styles.empty}>
        <Text style={styles.emptyTitle}>Tracking not started</Text>
        <Text style={styles.muted}>Mark food ready from Home first.</Text>
        <Button title="Go Back" variant="outline" onPress={handleBack} style={{ marginTop: spacing.lg }} />
      </SafeAreaView>
    );
  }

  if (!order.driver) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <TrackingHeader
          horizontalPadding={horizontalPadding}
          refreshing={refreshing}
          onBack={handleBack}
          onRefresh={() => void handleRefresh()}
        />
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.orange} />
          <Text style={[styles.emptyTitle, { marginTop: spacing.lg }]}>Finding a driver</Text>
          <Text style={styles.muted}>Your pickup request was sent. A driver will accept shortly.</Text>
          <Badge label={getStatusLabel(order.status)} tone="orange" />
        </View>
      </SafeAreaView>
    );
  }

  const isInTransit = ['in_transit', 'at_drop', 'picked_up'].includes(order.status);
  const etaMinutes = liveEtaMinutes ?? (isInTransit ? 14 : 8);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TrackingHeader
        horizontalPadding={horizontalPadding}
        refreshing={refreshing}
        onBack={handleBack}
        onRefresh={() => void handleRefresh()}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} bounces>
        <View style={styles.heroBlock}>
          <View style={[styles.statusSection, { paddingHorizontal: horizontalPadding }]}>
            <LinearGradient
              colors={['#FFF5F9', '#FFFFFF', '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.statusCard}
            >
              <View style={styles.statusCardBody}>
                <Text style={styles.statusMessage}>{getTrackingStatusMessage(order.status)}</Text>
                <Text style={styles.etaLabel}>ETA</Text>
                <Text style={styles.etaValue}>{etaMinutes} min</Text>
              </View>
              <Text style={styles.scooterArt} accessibilityLabel="Delivery rider">
                🛵
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.mapSection}>
            <LiveDeliveryMap key={mapKey} order={order} height={320} />
          </View>
        </View>

        <View style={[styles.details, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.driverRow}>
            <Avatar initials={order.driver.initials} />
            <Text style={styles.driverName} numberOfLines={1}>
              {order.driver.name}
            </Text>
            <Badge label={getStatusLabel(order.status)} tone={getStatusBadgeTone(order.status)} />
            <Button
              title="Call"
              variant="green"
              small
              onPress={() => void callDriver(order)}
              style={styles.callBtn}
            />
          </View>

          <Text style={styles.timelineTitle}>Delivery Timeline</Text>
          <Timeline steps={getTrackingTimeline(order)} />
          <Button title="Full Status" variant="outline" onPress={() => navigation.navigate('DeliveryStatus')} style={{ marginTop: spacing.md }} />
          <View style={styles.linkRow}>
            <Button title="QR & OTP" variant="outline" small onPress={() => navigation.navigate('QRTracking')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.orange },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.bg },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.orange,
    paddingVertical: spacing.md,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.onPrimary,
    letterSpacing: -0.2,
  },
  scroll: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: spacing.xl * 2 },
  heroBlock: {
    overflow: 'visible',
  },
  statusSection: {
    backgroundColor: colors.bg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    zIndex: 2,
  },
  mapSection: {
    width: '100%',
    height: 320,
    marginTop: -STATUS_CARD_MAP_OVERLAP,
    backgroundColor: colors.surfaceMuted,
    zIndex: 1,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(233, 30, 99, 0.07)',
    zIndex: 3,
    elevation: 8,
    ...shadow.subtle,
  },
  statusCardBody: { flex: 1, paddingRight: spacing.sm },
  statusMessage: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.orangeDark,
    marginBottom: spacing.sm,
  },
  etaLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  etaValue: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 2 },
  scooterArt: { fontSize: 52, lineHeight: 58 },
  details: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  muted: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 18 },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
  },
  driverName: { flex: 1, fontWeight: '700', fontSize: 15, minWidth: 0 },
  callBtn: { alignSelf: 'center', flexShrink: 0 },
  timelineTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  linkRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
});
