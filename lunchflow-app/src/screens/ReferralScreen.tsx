import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { ProfileStackParamList } from '../navigation/types';
import {
  REFERRAL_REWARD_AMOUNT,
  ReferralEvent,
  ReferralStats,
  buildReferralShareMessage,
  loadReferralStats,
} from '../services/referralService';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Referral'>;

export function ReferralScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [sharing, setSharing] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.phone) {
      setStats(null);
      return;
    }
    setStats(await loadReferralStats(user.phone, user.name || 'Customer'));
  }, [user?.name, user?.phone]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleShare = async () => {
    if (!stats?.code || sharing) return;
    setSharing(true);
    try {
      await Share.share({
        title: 'Invite to LunchFlow',
        message: buildReferralShareMessage(stats.code),
      });
    } finally {
      setSharing(false);
    }
  };

  const handleCopyCode = async () => {
    if (!stats?.code) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(stats.code);
      Alert.alert('Copied', 'Referral code copied to clipboard.');
      return;
    }
    await handleShare();
  };

  const code = stats?.code ?? '------';
  const creditsEarned = stats?.creditsEarned ?? 0;
  const friendsInvited = stats?.friendsInvited ?? 0;
  const successful = stats?.successfulReferrals ?? 0;
  const events = stats?.events ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Referral & Rewards" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient colors={[colors.green, colors.greenDark]} style={styles.banner}>
          <Text style={styles.bannerSub}>Invite Friends & Earn</Text>
          <Text style={styles.bannerTitle}>Get ₹{REFERRAL_REWARD_AMOUNT} per referral</Text>
          <Pressable style={styles.codeBox} onPress={handleCopyCode}>
            <Text style={styles.code}>{code}</Text>
            <Text style={styles.codeHint}>Tap to copy or share</Text>
          </Pressable>
          <Button title="Invite Friends" onPress={handleShare} style={styles.inviteBtn} />
        </LinearGradient>

        <View style={styles.stats}>
          <StatBox value={`₹${creditsEarned}`} label="Credits Earned" />
          <StatBox value={String(friendsInvited)} label="Friends Invited" />
          <StatBox value={String(successful)} label="Successful" />
        </View>

        <Text style={styles.section}>Rewards Dashboard</Text>
        {events.length ? (
          events.map((event) => <RewardRow key={event.id} event={event} />)
        ) : (
          <Card flat style={{ paddingVertical: 16 }}>
            <Text style={styles.emptyText}>Share your code to start earning referral rewards.</Text>
          </Card>
        )}
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

function RewardRow({ event }: { event: ReferralEvent }) {
  return (
    <Card flat style={{ paddingVertical: 14, marginBottom: 8 }}>
      <View style={styles.rewardRow}>
        <View style={styles.rewardInfo}>
          <Text style={styles.rewardTitle}>{event.title}</Text>
          <Text style={styles.rewardDesc}>{event.description}</Text>
        </View>
        <View style={styles.rewardMeta}>
          <Text style={styles.rewardAmt}>+₹{event.amount}</Text>
          <Text style={styles.rewardDate}>{event.date}</Text>
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
  codeHint: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
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
  rewardRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rewardInfo: { flex: 1 },
  rewardMeta: { alignItems: 'flex-end' },
  rewardTitle: { fontWeight: '700', fontSize: 14 },
  rewardDesc: { fontSize: 12, color: colors.muted, marginTop: 2 },
  rewardAmt: { fontWeight: '800', color: colors.green },
  rewardDate: { fontSize: 11, color: colors.muted, marginTop: 4 },
  emptyText: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});
