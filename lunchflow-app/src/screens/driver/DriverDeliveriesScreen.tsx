import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Timeline } from '../../components/Timeline';
import { colors, spacing } from '../../constants/theme';

const activeDelivery = {
  id: 'LF-8842',
  customer: 'Priya Sharma',
  route: 'Green Park → DPS School',
  steps: [
    { title: 'Food Ready', time: '12:02 PM', status: 'done' as const },
    { title: 'Picked Up', time: '12:08 PM', status: 'done' as const },
    { title: 'In Transit', time: 'Now', status: 'active' as const },
    { title: 'Delivered', time: '—', status: 'pending' as const },
  ],
};

const completed = [
  { id: 'LF-8839', route: 'Home → DPS', time: '11:45 AM', status: 'Delivered' },
  { id: 'LF-8838', route: 'Home → Office', time: '11:20 AM', status: 'Delivered' },
];

export function DriverDeliveriesScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Deliveries</Text>
        <Text style={styles.sub}>Today's route & history</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.section}>Active Delivery</Text>
        <Card>
          <View style={styles.row}>
            <Text style={styles.orderId}>{activeDelivery.id}</Text>
            <Badge label="In Transit" tone="orange" />
          </View>
          <Text style={styles.customer}>{activeDelivery.customer}</Text>
          <Text style={styles.muted}>{activeDelivery.route}</Text>
          <Timeline steps={activeDelivery.steps} />
          <Button title="Mark Delivered" variant="green" onPress={() => {}} style={{ marginTop: 12 }} />
        </Card>

        <Text style={styles.section}>Completed Today</Text>
        {completed.map((d) => (
          <Card flat key={d.id} style={{ paddingVertical: 12 }}>
            <View style={styles.row}>
              <View>
                <Text style={styles.orderId}>{d.id}</Text>
                <Text style={styles.muted}>{d.route} · {d.time}</Text>
              </View>
              <Badge label={d.status} tone="green" />
            </View>
          </Card>
        ))}
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
