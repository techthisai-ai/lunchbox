import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, gradients, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { ProfileStackParamList } from '../navigation/types';
import { downloadReceipt, loadWallet, WalletState } from '../services/paymentService';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Wallet'>;

export function WalletScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletState | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.phone) {
      setWallet(null);
      return;
    }
    setWallet(await loadWallet(user.phone));
  }, [user?.phone]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleDownloadReceipt = () => {
    const latest = wallet?.transactions[0];
    if (!latest) {
      Alert.alert('No receipt', 'Complete a payment first to download a receipt.');
      return;
    }

    const downloaded = downloadReceipt(latest);
    if (!downloaded) {
      Alert.alert('Receipt', latest.receiptText);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Wallet & Payments" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient colors={[...gradients.primary]} style={styles.balance}>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.amount}>₹{(wallet?.balance ?? 1250).toLocaleString('en-IN')}</Text>
          <Text style={styles.credit}>+ ₹{wallet?.referralCredit ?? 50} referral credit</Text>
        </LinearGradient>

        <Text style={styles.section}>Payment Methods</Text>
        <Card>
          {(wallet?.paymentMethods ?? []).map((method) => (
            <PayRow
              key={method.id}
              icon={method.icon}
              iconBg={method.iconBg}
              iconColor={method.iconColor}
              title={method.title}
              sub={method.sub}
              badge={method.badge}
            />
          ))}
        </Card>

        <Text style={styles.section}>Transaction History</Text>
        {(wallet?.transactions ?? []).map((t) => (
          <Card flat key={t.id} style={{ paddingVertical: 12 }}>
            <View style={styles.txRow}>
              <View>
                <Text style={styles.txDesc}>{t.desc}</Text>
                <Text style={styles.txDate}>{t.date} · {t.method}</Text>
              </View>
              <Text style={[styles.txAmt, t.positive && { color: colors.green }]}>{t.amt}</Text>
            </View>
          </Card>
        ))}
        <Button title="Download Receipt" variant="outline" onPress={handleDownloadReceipt} style={{ marginTop: spacing.md }} />
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
