import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { colors, spacing } from '../../constants/theme';

const orders = [
  { id: 'LF-8842', time: '12:02 PM', customer: 'Priya Sharma', pickup: 'Green Park', drop: 'DPS School', driver: 'Rajesh K.', status: 'In Transit' },
  { id: 'LF-8843', time: '12:15 PM', customer: 'Rahul Mehta', pickup: 'Sector 18', drop: 'Office Tower', driver: 'Unassigned', status: 'Food Ready' },
  { id: 'LF-8844', time: '12:20 PM', customer: 'Neha Gupta', pickup: 'Rohini', drop: 'DAV School', driver: 'Amit S.', status: 'Picked Up' },
];

export function AdminOrdersScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.sub}>Manage pickup & delivery requests</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {orders.map((o) => (
          <Card key={o.id}>
            <View style={styles.row}>
              <Text style={styles.orderId}>{o.id}</Text>
              <Badge label={o.status} tone={o.status === 'Unassigned' ? 'orange' : 'green'} />
            </View>
            <Text style={styles.muted}>{o.time} · {o.customer}</Text>
            <Text style={styles.route}>{o.pickup} → {o.drop}</Text>
            <Text style={styles.driver}>Driver: {o.driver}</Text>
            {o.driver === 'Unassigned' ? (
              <Button title="Assign Driver" small onPress={() => {}} style={{ marginTop: 10 }} />
            ) : null}
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderId: { fontWeight: '800', fontSize: 15 },
  muted: { fontSize: 12, color: colors.muted },
  route: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  driver: { fontSize: 12, color: colors.muted, marginTop: 4 },
});
