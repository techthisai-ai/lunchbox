import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../../components/Badge';
import { Card } from '../../components/Card';
import { colors, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

const stats = [
  { label: 'Active Orders', value: '24', tone: 'orange' as const },
  { label: 'Drivers Online', value: '8', tone: 'green' as const },
  { label: 'Deliveries Today', value: '156', tone: 'blue' as const },
  { label: 'Revenue Today', value: '₹18K', tone: 'orange' as const },
];

const recentOrders = [
  { id: 'LF-8842', customer: 'Priya Sharma', route: 'Home → DPS', status: 'In Transit', tone: 'orange' as const },
  { id: 'LF-8841', customer: 'Ankit Verma', route: 'Home → Office', status: 'Picked Up', tone: 'green' as const },
  { id: 'LF-8840', customer: 'Sneha Patel', route: 'Home → School', status: 'Delivered', tone: 'green' as const },
];

export function AdminDashboardScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Admin Dashboard</Text>
        <Text style={styles.name}>{user?.name}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statVal}>{s.value}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.section}>Live Pickup Requests</Text>
        {recentOrders.map((o) => (
          <Card key={o.id} flat style={{ paddingVertical: 12 }}>
            <View style={styles.row}>
              <View>
                <Text style={styles.orderId}>{o.id}</Text>
                <Text style={styles.muted}>{o.customer} · {o.route}</Text>
              </View>
              <Badge label={o.status} tone={o.tone} />
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
  greeting: { fontSize: 13, color: colors.muted },
  name: { fontSize: 22, fontWeight: '800' },
  scroll: { padding: spacing.md, paddingBottom: 24 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.lg },
  statBox: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statVal: { fontSize: 22, fontWeight: '800', color: colors.orange },
  statLbl: { fontSize: 11, color: colors.muted, fontWeight: '600', marginTop: 4 },
  section: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: '700', fontSize: 14 },
  muted: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
