import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getInitials } from '../constants/auth';
import { SubscriptionPlan } from '../constants/subscriptions';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { ProfileStackParamList } from '../navigation/types';
import { loadActiveSubscription } from '../services/subscriptionService';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

const baseMenuItems = [
  { icon: 'person-outline' as const, label: 'Personal Details', route: 'PersonalDetails' as const },
  { icon: 'document-text-outline' as const, label: 'Subscription Details', route: 'Subscription' as const },
  { icon: 'location-outline' as const, label: 'Saved Addresses', sub: '2 addresses', route: 'SavedAddresses' as const },
  { icon: 'gift-outline' as const, label: 'Referral & Rewards', route: 'Referral' as const },
  { icon: 'wallet-outline' as const, label: 'Wallet & Payments', route: 'Wallet' as const },
  { icon: 'help-circle-outline' as const, label: 'Help & Support', route: 'Support' as const },
  { icon: 'settings-outline' as const, label: 'Settings', route: 'Settings' as const },
];

export function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const [activePlan, setActivePlan] = useState<SubscriptionPlan | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user?.phone) {
        setActivePlan(null);
        return;
      }
      loadActiveSubscription(user.phone).then(setActivePlan);
    }, [user?.phone]),
  );

  const menuItems = useMemo(
    () =>
      baseMenuItems.map((item) =>
        item.route === 'Subscription'
          ? {
              ...item,
              sub: activePlan ? `${activePlan.badgeLabel} · ${activePlan.price}` : 'Student · 1M · ₹699',
            }
          : item,
      ),
    [activePlan],
  );

  const handleLogout = async () => {
    await logout();
    navigation.getParent()?.getParent()?.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Splash' }] }),
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(user?.name ?? '')}</Text>
        </View>
        <Text style={styles.name}>{user?.name || '—'}</Text>
        <Text style={styles.phone}>{user?.phone ? `+91 ${user.phone}` : '—'}</Text>
      </View>
      <ScrollView>
        {menuItems.map((item) => (
          <Pressable
            key={item.label}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.route)}
          >
            <View style={styles.menuLeft}>
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={18} color={colors.text} />
              </View>
              <View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.sub ? <Text style={styles.menuSub}>{item.sub}</Text> : null}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
        <Pressable style={styles.menuItem} onPress={handleLogout}>
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, { backgroundColor: colors.redLight }]}>
              <Ionicons name="log-out-outline" size={18} color={colors.red} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.red }]}>Logout</Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { alignItems: 'center', paddingVertical: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.orangeLight,
    borderWidth: 3,
    borderColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: colors.orange },
  name: { fontSize: 20, fontWeight: '800' },
  phone: { fontSize: 13, color: colors.muted, marginTop: 4 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontWeight: '600', fontSize: 14 },
  menuSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
});
