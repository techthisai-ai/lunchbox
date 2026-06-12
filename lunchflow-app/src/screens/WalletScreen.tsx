import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, spacing } from '../constants/theme';
import { ProfileStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Wallet'>;

const transactions = [
  { date: 'Jun 11', desc: 'Subscription', amt: '-₹699', positive: false },
  { date: 'Jun 10', desc: 'Referral Credit', amt: '+₹50', positive: true },
  { date: 'Jun 1', desc: 'Subscription', amt: '-₹699', positive: false },
];

export function WalletScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Wallet & Payments" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient colors={[colors.orange, colors.orangeDark]} style={styles.balance}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.amount}>₹1,250</Text>
          <Text style={styles.credit}>+ ₹50 referral credit</Text>
        </LinearGradient>

        <Text style={styles.section}>Payment Methods</Text>
        <Card>
          <PayRow icon="UPI" iconBg={colors.greenLight} iconColor={colors.green} title="UPI" sub="priya@upi · Default" badge="Active" />
          <PayRow icon="VISA" iconBg={colors.blueLight} iconColor={colors.blue} title="•••• 4242" sub="Expires 08/27" />
        </Card>

        <Text style={styles.section}>Transaction History</Text>
        {transactions.map((t) => (
          <Card flat key={t.date + t.desc} style={{ paddingVertical: 12 }}>
            <View style={styles.txRow}>
              <View>
                <Text style={styles.txDesc}>{t.desc}</Text>
                <Text style={styles.txDate}>{t.date}</Text>
              </View>
              <Text style={[styles.txAmt, t.positive && { color: colors.green }]}>{t.amt}</Text>
            </View>
          </Card>
        ))}
        <Button title="Download Receipt" variant="outline" onPress={() => {}} style={{ marginTop: spacing.md }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PayRow({
  icon,
  iconBg,
  iconColor,
  title,
  sub,
  badge,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
  badge?: string;
}) {
  return (
    <View style={styles.payRow}>
      <View style={[styles.payIcon, { backgroundColor: iconBg }]}>
        <Text style={{ fontWeight: '800', fontSize: 11, color: iconColor }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.payTitle}>{title}</Text>
        <Text style={styles.paySub}>{sub}</Text>
      </View>
      {badge ? <Badge label={badge} tone="green" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 32 },
  balance: { borderRadius: 16, padding: spacing.xl, marginBottom: spacing.md },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  amount: { fontSize: 32, fontWeight: '800', color: colors.white, marginTop: 4 },
  credit: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  section: { fontSize: 16, fontWeight: '800', marginBottom: 12, marginTop: 4 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  payIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  payTitle: { fontWeight: '700' },
  paySub: { fontSize: 12, color: colors.muted },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txDesc: { fontWeight: '600', fontSize: 14 },
  txDate: { fontSize: 11, color: colors.muted },
  txAmt: { fontWeight: '700' },
});
