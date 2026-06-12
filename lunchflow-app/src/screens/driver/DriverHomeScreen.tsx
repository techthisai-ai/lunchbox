import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { DEMO_CREDENTIALS } from '../../constants/auth';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

const pickupRequests = [
  { id: 'LF-8843', customer: 'Rahul Mehta', address: '42 Green Park', drop: 'Office Tower', eta: '5 min away', status: 'New' },
  { id: 'LF-8842', customer: 'Priya Sharma', address: 'Green Park Block C', drop: 'DPS School', eta: 'Active', status: 'Accepted' },
];

export function DriverHomeScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, Driver</Text>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.vehicle}>{DEMO_CREDENTIALS.driver.vehicle}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.statusCard}>
          <Text style={styles.statusLabel}>Your Status</Text>
          <Badge label="Online · Accepting Orders" tone="green" />
        </Card>

        <Text style={styles.section}>New Pickup Requests</Text>
        {pickupRequests.map((r) => (
          <Card key={r.id}>
            <View style={styles.row}>
              <Text style={styles.orderId}>{r.id}</Text>
              <Badge label={r.status} tone={r.status === 'New' ? 'orange' : 'green'} />
            </View>
            <Text style={styles.customer}>{r.customer}</Text>
            <Text style={styles.muted}>Pickup: {r.address}</Text>
            <Text style={styles.muted}>Drop: {r.drop}</Text>
            {r.status === 'New' ? (
              <View style={styles.actions}>
                <Button title="Accept Pickup" variant="green" small onPress={() => {}} />
                <Button title="Decline" variant="outline" small onPress={() => {}} />
              </View>
            ) : (
              <Button title="Mark Picked Up" onPress={() => {}} style={{ marginTop: 12 }} />
            )}
          </Card>
        ))}
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
  section: { fontSize: 16, fontWeight: '800', marginVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: '800', fontSize: 15 },
  customer: { fontWeight: '700', fontSize: 15, marginTop: 8 },
  muted: { fontSize: 12, color: colors.muted, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
