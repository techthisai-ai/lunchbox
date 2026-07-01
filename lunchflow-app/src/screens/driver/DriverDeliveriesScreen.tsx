import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { PickupVerifyDialog } from '../../components/PickupVerifyDialog';
import { DriverKpiRow } from '../../components/driver/DriverKpiRow';
import { DriverScreenHeader } from '../../components/driver/DriverScreenHeader';
import { DriverOrderAddressDialog } from '../../components/DriverOrderAddressDialog';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { DriverTabParamList, RootStackParamList } from '../../navigation/types';
import {
  listDriverActiveOrders,
  listDriverCompletedToday,
  listPendingPickups,
  markAtDrop,
  markAtPickup,
  markDelivered,
  markPickedUp,
  verifyPickup,
} from '../../services/orderHubService';
import { openMapsNavigationToAddress } from '../../services/mapsNavigation';
import { subscribeToOrderChanges } from '../../services/orderSync';
import { DeliveryOrder } from '../../types/delivery';
import { buildDriverDeliveryStops, DriverDeliveryStop } from '../../utils/driverDeliveryStops';

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

export function DriverDeliveriesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const [activeOrders, setActiveOrders] = useState<DeliveryOrder[]>([]);
  const [completed, setCompleted] = useState<DeliveryOrder[]>([]);
  const [pending, setPending] = useState<DeliveryOrder[]>([]);
  const [verifyOrder, setVerifyOrder] = useState<DeliveryOrder | null>(null);
  const [addressOrder, setAddressOrder] = useState<DeliveryOrder | null>(null);
  const [actionError, setActionError] = useState('');

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const [activeList, done, pendingList] = await Promise.all([
      listDriverActiveOrders(user.id),
      listDriverCompletedToday(user.id),
      listPendingPickups(),
    ]);
    setActiveOrders(activeList);
    setCompleted(done);
    setPending(pendingList);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const interval = setInterval(refresh, 3000);
      return () => clearInterval(interval);
    }, [refresh]),
  );

  useEffect(() => subscribeToOrderChanges(refresh), [refresh]);

  const pickupPendingCount = activeOrders.filter((o) =>
    ['driver_assigned', 'at_pickup', 'pickup_verified'].includes(o.status),
  ).length;
  const activeCount = activeOrders.filter((o) =>
    ['in_transit', 'at_drop', 'picked_up'].includes(o.status),
  ).length;

  const stops = useMemo(
    () => buildDriverDeliveryStops(pending, activeOrders),
    [pending, activeOrders],
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
    setActionError('');
    try {
      await markAtDrop(orderId);
      await markDelivered(orderId);
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not mark delivered');
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
        visible={Boolean(verifyOrder)}
        orderLabel={verifyOrder?.customerName ?? ''}
        onVerify={handleVerify}
        onCancel={() => setVerifyOrder(null)}
      />
      <DriverOrderAddressDialog
        visible={Boolean(addressOrder)}
        order={addressOrder}
        onClose={() => setAddressOrder(null)}
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
          ]}
        />

        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

        <Text style={styles.section}>Delivery Sequence</Text>
        {stops.length === 0 ? (
          <Card flat>
            <Text style={styles.muted}>No deliveries in your queue.</Text>
          </Card>
        ) : (
          stops.map((stop, index) => (
            <View key={stop.key} style={styles.stopRow}>
              <View style={styles.timelineCol}>
                <View style={styles.stopNumber}>
                  <Text style={styles.stopNumberText}>{stop.stopNumber}</Text>
                </View>
                {index < stops.length - 1 ? <View style={styles.timelineLine} /> : null}
              </View>

              <Card style={styles.stopCard}>
                <Pressable onPress={() => setAddressOrder(stop.order)}>
                  <View style={styles.stopHeader}>
                    <Text style={styles.stopId}>{stop.order.id}</Text>
                    <Badge label={phaseLabel(stop.phase)} tone={phaseTone(stop.phase)} />
                  </View>
                  <Text style={styles.stopTitle}>{stop.title}</Text>
                  <Text style={styles.stopAddress} numberOfLines={3}>
                    {stop.address || '—'}
                  </Text>
                  <Text style={styles.stopTime}>{stop.timeLabel}</Text>
                </Pressable>

                <View style={styles.stopActions}>
                  {stop.phase === 'pickup_pending' ? (
                    <>
                      <Button title="Verify OTP" variant="outline" small onPress={() => openVerify(stop.order)} />
                      <Button title="Scan QR" variant="outline" small onPress={() => openVerify(stop.order)} />
                      <Button
                        title="Navigate"
                        variant="green"
                        small
                        onPress={() => openMapsNavigationToAddress(stop.order.pickupAddress)}
                      />
                    </>
                  ) : null}
                  {stop.phase === 'active' ? (
                    <>
                      <Button title="Navigate" variant="outline" small onPress={() => openMapsNavigationToAddress(stop.address)} />
                      <Button title="Mark Delivered" variant="green" small onPress={() => handleDeliver(stop.order.id)} />
                    </>
                  ) : null}
                  {stop.phase === 'pending' ? (
                    <Button title="View Details" variant="outline" small onPress={() => setAddressOrder(stop.order)} />
                  ) : null}
                  <Button
                    title="Call Customer"
                    variant="outline"
                    small
                    onPress={() => callCustomer(stop.order.customerPhone)}
                  />
                </View>
              </Card>
            </View>
          ))
        )}

        <Text style={styles.section}>Completed Today</Text>
        {completed.length === 0 ? (
          <Card flat>
            <Text style={styles.muted}>No completed deliveries yet today.</Text>
          </Card>
        ) : (
          completed.map((order) => (
            <Card flat key={order.id} style={styles.completedCard}>
              <View style={styles.stopHeader}>
                <Text style={styles.stopId}>{order.id}</Text>
                <Badge label="Delivered" tone="green" />
              </View>
              {order.deliveredAt ? <Text style={styles.stopTime}>Delivered at {order.deliveredAt}</Text> : null}
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
  stopTime: { fontSize: 11, color: colors.muted, marginTop: 6, fontWeight: '600' },
  stopActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  completedCard: { paddingVertical: 12 },
  muted: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  error: { color: colors.red, fontSize: 13 },
});
