import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, spacing } from '../constants/theme';
import { ProfileStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Referral'>;

export function ReferralScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Referral & Rewards" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient colors={[colors.green, colors.greenDark]} style={styles.banner}>
          <Text style={styles.bannerSub}>Invite Friends & Earn</Text>
          <Text style={styles.bannerTitle}>Get ₹50 per referral</Text>
          <View style={styles.codeBox}>
            <Text style={styles.code}>LUNCH50</Text>
          </View>
          <Button title="Invite Friends" onPress={() => {}} style={styles.inviteBtn} />
        </LinearGradient>

        <View style={styles.stats}>
          <StatBox value="₹250" label="Credits Earned" />
          <StatBox value="5" label="Friends Invited" />
          <StatBox value="3" label="Successful" />
        </View>

        <Text style={styles.section}>Rewards Dashboard</Text>
        <RewardRow title="Referral Bonus" desc="Priya referred Ankit" amt="+₹50" date="Jun 10" />
        <RewardRow title="Welcome Bonus" desc="Account signup" amt="+₹25" date="May 28" />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

function RewardRow({ title, desc, amt, date }: { title: string; desc: string; amt: string; date: string }) {
  return (
    <Card flat style={{ paddingVertical: 14 }}>
      <View style={styles.rewardRow}>
        <View>
          <Text style={styles.rewardTitle}>{title}</Text>
          <Text style={styles.rewardDesc}>{desc}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.rewardAmt}>{amt}</Text>
          <Text style={styles.rewardDate}>{date}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 32 },
  banner: { borderRadius: 16, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.md },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)' },
  bannerTitle: { fontSize: 22, fontWeight: '800', color: colors.onPrimary, marginTop: 4 },
  codeBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    padding: 12,
    marginVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    width: '100%',
    alignItems: 'center',
  },
  code: { fontSize: 20, fontWeight: '800', color: colors.onPrimary, letterSpacing: 3 },
  inviteBtn: { backgroundColor: colors.white, width: '100%' },
  stats: { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statVal: { fontSize: 18, fontWeight: '800', color: colors.orange },
  statLbl: { fontSize: 10, color: colors.muted, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  section: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rewardTitle: { fontWeight: '700', fontSize: 14 },
  rewardDesc: { fontSize: 12, color: colors.muted },
  rewardAmt: { fontWeight: '800', color: colors.green },
  rewardDate: { fontSize: 11, color: colors.muted, marginTop: 4 },
});
