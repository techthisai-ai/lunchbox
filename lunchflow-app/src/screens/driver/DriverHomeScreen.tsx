import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { PickupVerifyDialog } from '../../components/PickupVerifyDialog';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  acceptPickup,
  listDriverActiveOrders,
  markAtDrop,
  markAtPickup,
  markBatchOrdersDelivered,
  markDelivered,
  markPickedUp,
  subscribeToDriverOrdersToday,
  subscribeToPendingPickups,
  syncDriverLocationForOrder,
  verifyPickup,
} from '../../services/orderHubService';
import { listDriverBatches } from '../../services/batchDeliveryService';
import { DeliveryBatch } from '../../types/batch';
import { subscribeToOrderChanges } from '../../services/orderSync';
import { DeliveryOrder, getDropAddress } from '../../types/delivery';

export function DriverHomeScreen() {
  const { user } = useAuth();
  const [pending, setPending] = useState<DeliveryOrder[]>([]);
  const [active, setActive] = useState<DeliveryOrder[]>([]);
  const [inTransit, setInTransit] = useState<DeliveryOrder[]>([]);
  const [verifyOrder, setVerifyOrder] = useState<DeliveryOrder | null>(null);
  const [batches, setBatches] = useState<DeliveryBatch[]>([]);
  const [actionError, setActionError] = useState('');

  const syncActiveOrders = useCallback((mine: DeliveryOrder[]) => {
    setActive(mine.filter((o) => ['driver_assigned', 'at_pickup', 'pickup_verified'].includes(o.status)));
    setInTransit(mine.filter((o) => ['in_transit', 'at_drop', 'picked_up'].includes(o.status)));
  }, []);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const mine = await listDriverActiveOrders(user.id);
    syncActiveOrders(mine);
    setBatches(await listDriverBatches(user.id));
  }, [user?.id, syncActiveOrders]);

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
    return subscribeToDriverOrdersToday(user.id, syncActiveOrders);
  }, [user?.id, syncActiveOrders]);

  useEffect(() => subscribeToOrderChanges(refresh), [refresh]);

  useEffect(() => {
    if (!user?.id) return undefined;
    const interval = setInterval(async () => {
      const mine = await listDriverActiveOrders(user.id);
      const moving = mine.filter(
        (o) => o.driver && !['delivered', 'booked', 'awaiting_driver'].includes(o.status),
      );
      await Promise.all(moving.map((o) => syncDriverLocationForOrder(o.id)));
      syncActiveOrders(mine);
    }, 4000);
    return () => clearInterval(interval);
  }, [user?.id, syncActiveOrders]);

  const handleAccept = async (orderId: string) => {
    if (!user?.id || !user.name) return;
    setActionError('');
    try {
      await acceptPickup(orderId, { id: user.id, name: user.name, vehicle: user.vehicle });
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not accept pickup');
      await refresh();
    }
  };

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

  const handleDeliverBatch = async (batchId: string) => {
    setActionError('');
    try {
      await markBatchOrdersDelivered(batchId);
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not deliver batch');
    }
  };

  const routePlan = [...active, ...inTransit].find((o) => o.routePlan)?.routePlan;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PickupVerifyDialog
        visible={Boolean(verifyOrder)}
        orderLabel={verifyOrder?.customerName ?? ''}
        onVerify={handleVerify}
        onCancel={() => setVerifyOrder(null)}
      />
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, Driver</Text>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.vehicle}>{user?.vehicle || '—'}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.statusCard}>
          <Text style={styles.statusLabel}>Your Status</Text>
          <Badge label="Online · Accepting Orders" tone="green" />
        </Card>

        {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

        {routePlan ? (
          <Card flat>
            <Text style={styles.routeTitle}>Optimized Route</Text>
            <Text style={styles.muted}>
              {routePlan.totalStops} stops · ETA {routePlan.etaMinutes} min · Planned {routePlan.plannedAt}
            </Text>
          </Card>
        ) : null}

        <Text style={styles.section}>New Pickup Requests</Text>
        {pending.length === 0 ? (
          <Card flat>
            <Text style={styles.muted}>No new pickup requests. Customer must tap Food Ready first.</Text>
          </Card>
        ) : (
          pending.map((r) => (
            <Card key={r.id}>
              <View style={styles.row}>
                <Text style={styles.orderId}>{r.id}</Text>
                <Badge label="New" tone="orange" />
              </View>
              <Text style={styles.customer}>{r.customerName}</Text>
              <Text style={styles.muted}>Pickup: {r.pickupAddress}</Text>
              <Text style={styles.muted}>Drop: {getDropAddress(r)}</Text>
              <View style={styles.actions}>
                <Button title="Accept Pickup" variant="green" small onPress={() => handleAccept(r.id)} />
              </View>
            </Card>
          ))
        )}

        {active.length > 0 ? (
          <>
            <Text style={styles.section}>At Pickup — Verify OTP/QR</Text>
            {active.map((r) => (
              <Card key={r.id}>
                <View style={styles.row}>
                  <Text style={styles.orderId}>{r.id}</Text>
                  <Badge label="At Pickup" tone="orange" />
                </View>
                <Text style={styles.customer}>{r.customerName}</Text>
                <Text style={styles.muted}>Pickup: {r.pickupAddress}</Text>
                <Text style={styles.muted}>Ask customer for OTP or QR code</Text>
                <Button title="Verify & Pick Up" onPress={() => openVerify(r)} style={{ marginTop: 12 }} />
              </Card>
            ))}
          </>
        ) : null}

        {batches.length > 0 ? (
          <>
            <Text style={styles.section}>School Delivery Batches</Text>
            {batches.map((batch) => (
              <Card key={batch.id}>
                <View style={styles.row}>
                  <Text style={styles.orderId}>{batch.school}</Text>
                  <Badge label={`${batch.orderIds.length} orders`} tone="blue" />
                </View>
                <Text style={styles.muted}>Drop: {batch.dropAddress}</Text>
                <Button title="Deliver Entire Batch" variant="green" onPress={() => handleDeliverBatch(batch.id)} style={{ marginTop: 12 }} />
              </Card>
            ))}
          </>
        ) : null}

        {inTransit.length > 0 ? (
          <>
            <Text style={styles.section}>Deliver to School/Office</Text>
            {inTransit.map((r) => (
              <Card key={r.id}>
                <View style={styles.row}>
                  <Text style={styles.orderId}>{r.id}</Text>
                  <Badge label="In Transit" tone="green" />
                </View>
                <Text style={styles.customer}>{r.customerName}</Text>
                <Text style={styles.muted}>Drop: {getDropAddress(r)}</Text>
                <Button title="Mark Delivered" variant="green" onPress={() => handleDeliver(r.id)} style={{ marginTop: 12 }} />
              </Card>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  greeting: { fontSize: 13, color: colors.muted },
  name: { fontSize: 22, fontWeight: '800' },
  vehicle: { fontSize: 12, color: colors.green, fontWeight: '600', marginTop: 4 },
  scroll: { padding: spacing.md, paddingBottom: 24 },
  statusCard: { alignItems: 'flex-start', gap: 8 },
  statusLabel: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  routeTitle: { fontWeight: '700', fontSize: 14 },
  section: { fontSize: 16, fontWeight: '800', marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: '800', fontSize: 15 },
  customer: { fontWeight: '700', fontSize: 15, marginTop: 8 },
  muted: { fontSize: 12, color: colors.muted, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  error: { color: colors.red, fontSize: 13, marginBottom: 8 },
});
