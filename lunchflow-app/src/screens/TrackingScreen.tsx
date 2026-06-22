import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { LiveDeliveryMap } from '../components/LiveDeliveryMap';
import { Timeline } from '../components/Timeline';
import { colors, spacing } from '../constants/theme';
import { useDelivery } from '../context/DeliveryContext';
import { useLiveEta } from '../hooks/useLiveEta';
import { useResponsive } from '../hooks/useResponsive';
import { getStatusLabel, getTrackingTimeline, syncDriverLocationForOrder } from '../services/orderHubService';
import { TrackStackParamList } from '../navigation/types';
import { callDriver } from '../utils/phoneCall';
import { getEtaDestinationLabel } from '../utils/deliveryEta';

type Props = NativeStackScreenProps<TrackStackParamList, 'Tracking'>;

export function TrackingScreen({ navigation }: Props) {
  const { order, refreshDelivery } = useDelivery();
  const { horizontalPadding } = useResponsive();
  const liveEtaMinutes = useLiveEta(order);

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

  if (!order || order.status === 'booked') {
    return (
      <SafeAreaView style={styles.empty}>
        <Text style={styles.emptyTitle}>Tracking not started</Text>
        <Text style={styles.muted}>Mark food ready from Home first.</Text>
        <Button title="Go Back" variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: spacing.lg }} />
      </SafeAreaView>
    );
  }

  if (!order.driver) {
    return (
      <SafeAreaView style={styles.empty}>
        <ActivityIndicator size="large" color={colors.orange} />
        <Text style={[styles.emptyTitle, { marginTop: spacing.lg }]}>Finding a driver</Text>
        <Text style={styles.muted}>Your pickup request was sent. A driver will accept shortly.</Text>
        <Badge label={getStatusLabel(order.status)} tone="orange" />
      </SafeAreaView>
    );
  }

  const isInTransit = ['in_transit', 'at_drop', 'picked_up'].includes(order.status);
  const etaMinutes = liveEtaMinutes ?? (isInTransit ? 14 : 8);
  const etaLabel = getEtaDestinationLabel(order);

  return (
    <View style={styles.container}>
      <View style={styles.mapSection}>
        <LiveDeliveryMap order={order} height={320} />
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live tracking</Text>
        </View>
      </View>
      <ScrollView
        style={styles.overlayScroll}
        contentContainerStyle={[styles.overlay, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.etaRow}>
          <View>
            <Text style={styles.mutedLeft}>ETA to {etaLabel}</Text>
            <Text style={styles.eta}>{etaMinutes} min</Text>
          </View>
          <Badge label={getStatusLabel(order.status)} tone="orange" />
        </View>
        <View style={styles.driverRow}>
          <Avatar initials={order.driver.initials} large />
          <View style={{ flex: 1 }}>
            <Text style={styles.driverName}>{order.driver.name}</Text>
            <Text style={styles.mutedLeft}>★ {order.driver.rating} · {order.driver.vehicle}</Text>
          </View>
          <Button title="Call" variant="green" small onPress={() => void callDriver(order)} />
        </View>

        <Text style={styles.timelineTitle}>Delivery Timeline</Text>
        <Timeline steps={getTrackingTimeline(order)} />
        <Button title="Full Status" variant="outline" onPress={() => navigation.navigate('DeliveryStatus')} style={{ marginTop: spacing.md }} />
        <View style={styles.linkRow}>
          <Button title="QR & OTP" variant="outline" small onPress={() => navigation.navigate('QRTracking')} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  empty: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  mapSection: { height: 320, position: 'relative' },
  liveBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  liveText: { fontSize: 11, fontWeight: '700', color: colors.text },
  overlayScroll: { flex: 1, backgroundColor: colors.bg },
  overlay: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
  },
  etaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  muted: { fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 18 },
  mutedLeft: { fontSize: 12, color: colors.muted },
  eta: { fontSize: 24, fontWeight: '800', color: colors.orange },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: spacing.md },
  driverName: { fontWeight: '700', fontSize: 15 },
  timelineTitle: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  linkRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
});
