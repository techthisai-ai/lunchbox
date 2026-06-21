import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../components/Badge';
import { Card } from '../components/Card';
import { LiveDeliveryMap } from '../components/LiveDeliveryMap';
import { PickupVerificationCard } from '../components/PickupVerificationCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, spacing } from '../constants/theme';
import { useDelivery } from '../context/DeliveryContext';
import { getStatusLabel } from '../services/orderHubService';
import { TrackStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<TrackStackParamList, 'QRTracking'>;

export function QRTrackingScreen({ navigation }: Props) {
  const { order } = useDelivery();

  if (!order || order.status === 'booked') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="QR & OTP" subtitle="Live pickup verification" onBack={() => navigation.goBack()} />
        <Card flat style={{ margin: spacing.md }}>
          <Text style={styles.muted}>No active order. Mark food ready first.</Text>
        </Card>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="QR & OTP" subtitle="Live pickup verification" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <PickupVerificationCard order={order} />
        </Card>

        {order.driver ? (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <LiveDeliveryMap order={order} height={220} />
          </Card>
        ) : null}

        <Card title="Parcel Status" badge={<Badge label={getStatusLabel(order.status)} tone="orange" />}>
          <Text style={styles.muted}>
            OTP and QR refresh automatically when the order status changes.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 32, gap: spacing.md },
  muted: { fontSize: 12, color: colors.muted, lineHeight: 18 },
});
