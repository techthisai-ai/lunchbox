import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Timeline } from '../../components/Timeline';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  buildTimeline,
  getStatusLabel,
  listDriverActiveOrders,
  listDriverCompletedToday,
  markAtDrop,
  markDelivered,
} from '../../services/orderHubService';
import { subscribeToOrderChanges } from '../../services/orderSync';
import { DeliveryOrder, getDropAddress } from '../../types/delivery';

export function DriverDeliveriesScreen() {
  const { user } = useAuth();
  const [active, setActive] = useState<DeliveryOrder | null>(null);
  const [completed, setCompleted] = useState<DeliveryOrder[]>([]);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const [activeOrders, done] = await Promise.all([
      listDriverActiveOrders(user.id),
      listDriverCompletedToday(user.id),
    ]);
    const inTransit = activeOrders.find((o) => ['in_transit', 'at_drop', 'picked_up'].includes(o.status));
    setActive(inTransit ?? null);
    setCompleted(done);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const interval = setInterval(refresh, 3000);
      return () => clearInterval(interval);
    }, [refresh]),
  );

  useEffect(() => subscribeToOrderChanges(refresh), [refresh]);

  const handleDelivered = async () => {
    if (!active || !user?.id) return;
    await markAtDrop(active.id);
    await markDelivered(active.id);
    refresh();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Deliveries</Text>
        <Text style={styles.sub}>Today's route & history</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.section}>Active Delivery</Text>
        {active ? (
          <Card>
            <View style={styles.row}>
              <Text style={styles.orderId}>{active.id}</Text>
              <Badge label={getStatusLabel(active.status)} tone="orange" />
            </View>
            <Text style={styles.customer}>{active.customerName}</Text>
            <Text style={styles.muted}>{active.pickupAddress} → {getDropAddress(active)}</Text>
            <Timeline steps={buildTimeline(active).slice(3)} />
            <Button title="Mark Delivered" variant="green" onPress={handleDelivered} style={{ marginTop: 12 }} />
          </Card>
        ) : (
          <Card flat>
            <Text style={styles.muted}>No active delivery in transit.</Text>
          </Card>
        )}

        <Text style={styles.section}>Completed Today</Text>
        {completed.length > 0 ? (
          completed.map((d) => (
            <Card flat key={d.id} style={{ paddingVertical: 12 }}>
              <View style={styles.row}>
                <View>
                  <Text style={styles.orderId}>{d.id}</Text>
                  <Text style={styles.muted}>{d.pickupAddress} → {getDropAddress(d)} · {d.deliveredAt}</Text>
                </View>
                <Badge label="Delivered" tone="green" />
              </View>
            </Card>
          ))
        ) : (
          <Card flat>
            <Text style={styles.muted}>No completed deliveries yet today.</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 22, fontWeight: '800' },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  scroll: { padding: spacing.md, paddingBottom: 24 },
  section: { fontSize: 16, fontWeight: '800', marginBottom: 12, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: '800', fontSize: 14 },
  customer: { fontWeight: '700', marginTop: 8 },
  muted: { fontSize: 12, color: colors.muted, marginTop: 4 },
});
