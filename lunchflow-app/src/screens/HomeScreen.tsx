import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '../components/Avatar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { colors, spacing } from '../constants/theme';
import { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

const quickActions = [
  { icon: 'location' as const, label: 'Track', screen: true, bg: colors.orangeLight, color: colors.orange },
  { icon: 'document-text' as const, label: 'History', tab: 'History' as const, bg: colors.greenLight, color: colors.green },
  { icon: 'wallet' as const, label: 'Wallet', route: 'Wallet' as const, bg: colors.blueLight, color: colors.blue },
  { icon: 'gift' as const, label: 'Refer', route: 'Referral' as const, bg: '#FDF4FF', color: '#9333EA' },
];

export function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.name}>Priya Sharma</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.notifBtn} onPress={() => navigation.navigate('Notifications')}>
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
          </Pressable>
          <Avatar initials="PS" />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient colors={[colors.orangeLight, colors.white]} style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.cardTitle}>Today's Delivery</Text>
            <Badge label="In Progress" tone="orange" />
          </View>
          <Text style={styles.muted}>Lunchbox for Aarav · DPS School</Text>
          <Text style={styles.eta}>12:35 PM</Text>
          <Text style={styles.etaLabel}>Estimated arrival</Text>
        </LinearGradient>

        <Pressable style={styles.foodReady} onPress={() => navigation.navigate('FoodReady')}>
          <Ionicons name="fast-food" size={36} color={colors.white} />
          <Text style={styles.foodReadyLabel}>Food Ready</Text>
          <Text style={styles.foodReadySub}>Tap when lunch is packed</Text>
        </Pressable>

        <Card title="Driver Status" badge={<Badge label="En Route" tone="green" />}>
          <View style={styles.driverRow}>
            <Avatar initials="RK" large />
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>Rajesh Kumar</Text>
              <Text style={styles.muted}>DL 4C AB 1234 · ★ 4.9</Text>
            </View>
            <Button title="Call" variant="outline" small onPress={() => {}} />
          </View>
        </Card>

        <Card flat title="Active Subscription" badge={<Badge label="School Plan" tone="green" />}>
          <Text style={styles.subText}>₹699/month · Renews Jun 28</Text>
        </Card>

        <Text style={styles.section}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((a) => (
            <Pressable
              key={a.label}
              style={styles.quickItem}
              onPress={() => {
                if (a.screen) {
                  navigation.getParent()?.navigate('Track', { screen: 'Tracking' });
                } else if (a.tab) {
                  navigation.getParent()?.navigate(a.tab);
                } else if (a.route === 'Wallet') {
                  navigation.getParent()?.navigate('Profile', { screen: 'Wallet' });
                } else if (a.route === 'Referral') {
                  navigation.getParent()?.navigate('Profile', { screen: 'Referral' });
                }
              }}
            >
              <View style={[styles.quickIcon, { backgroundColor: a.bg }]}>
                <Ionicons name={a.icon} size={18} color={a.color} />
              </View>
              <Text style={styles.quickLabel}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Recent Deliveries</Text>
        <DeliveryRow date="Jun 11" status="Delivered" time="12:28 PM" />
        <DeliveryRow date="Jun 10" status="Delivered" time="12:31 PM" />
      </ScrollView>
    </SafeAreaView>
  );
}

function DeliveryRow({ date, status, time }: { date: string; status: string; time: string }) {
  return (
    <Card flat style={{ paddingVertical: 12 }}>
      <View style={styles.deliveryRow}>
        <View>
          <Text style={styles.deliveryDate}>{date}</Text>
          <Text style={styles.muted}>Home → DPS School</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Badge label={status} tone="green" />
          <Text style={[styles.muted, { marginTop: 4, fontSize: 11 }]}>{time}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  greeting: { fontSize: 13, color: colors.muted },
  name: { fontSize: 20, fontWeight: '800' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: spacing.md, paddingBottom: 24 },
  statusCard: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  muted: { fontSize: 12, color: colors.muted },
  eta: { fontSize: 28, fontWeight: '800', color: colors.orange, textAlign: 'center', marginTop: 8 },
  etaLabel: { textAlign: 'center', fontSize: 12, color: colors.muted },
  foodReady: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.orange,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  foodReadyLabel: { color: colors.white, fontSize: 16, fontWeight: '800', marginTop: 8 },
  foodReadySub: { color: colors.white, fontSize: 11, opacity: 0.85, marginTop: 4 },
  driverRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  driverName: { fontWeight: '700', fontSize: 15 },
  subText: { fontSize: 14, fontWeight: '600' },
  section: { fontSize: 16, fontWeight: '800', marginVertical: 12 },
  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  quickItem: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  quickLabel: { fontSize: 10, fontWeight: '600', color: colors.muted },
  deliveryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deliveryDate: { fontWeight: '700', fontSize: 14 },
});
