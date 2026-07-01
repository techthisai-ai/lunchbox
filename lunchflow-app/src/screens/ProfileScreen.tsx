import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getInitials } from '../constants/auth';
import { SubscriptionPlan } from '../constants/subscriptions';
import { colors, radius, shadow, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useResponsive } from '../hooks/useResponsive';
import { ProfileStackParamList } from '../navigation/types';
import { getCustomerOrderToday, loadCustomerProfile } from '../services/orderHubService';
import { loadWallet } from '../services/paymentService';
import { loadActiveSubscription } from '../services/subscriptionService';
import { buildFoodReadyStudents, getDropAddress, normalizeDeliveryType } from '../types/delivery';
import { formatDisplayDate } from '../utils/date';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

type MenuRoute = keyof ProfileStackParamList | 'Notifications';

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: MenuRoute;
  sub?: string;
};

function getRenewalFullLabel(): string {
  const renew = new Date();
  renew.setMonth(renew.getMonth() + 1);
  renew.setDate(28);
  if (renew.getTime() < Date.now()) {
    renew.setMonth(renew.getMonth() + 1);
  }
  return formatDisplayDate(renew);
}

function getPlanLabel(plan: SubscriptionPlan | null): string {
  if (!plan) return 'Student Plan';
  const category = plan.category.charAt(0).toUpperCase() + plan.category.slice(1);
  return `${category} Plan`;
}

export function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const { horizontalPadding } = useResponsive();
  const [activePlan, setActivePlan] = useState<SubscriptionPlan | null>(null);
  const [deliveryAddressCount, setDeliveryAddressCount] = useState(1);
  const [walletBalance, setWalletBalance] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!user?.phone) {
        setActivePlan(null);
        setDeliveryAddressCount(1);
        setWalletBalance(0);
        return;
      }
      loadActiveSubscription(user.phone).then(setActivePlan);
      loadWallet(user.phone).then((wallet) => setWalletBalance(wallet?.balance ?? 0));
      Promise.all([loadCustomerProfile(user.phone), getCustomerOrderToday(user.phone)]).then(
        ([profile, order]) => {
          const fallbackAddress = (order ? getDropAddress(order) : '') || profile.school || '';
          const students = buildFoodReadyStudents({
            studentEntries: order?.studentEntries,
            students: order?.studentEntries,
            person: order?.studentName || profile.studentName,
            dropAddress: fallbackAddress,
            deliveryType: normalizeDeliveryType(order?.deliveryType ?? profile.deliveryType),
            deliveryTypes: order?.deliveryTypes,
          });
          const filled = students.filter((entry) => entry.dropLocation.trim());
          setDeliveryAddressCount(filled.length || (fallbackAddress.trim() ? 1 : 0));
        },
      );
    }, [user?.phone]),
  );

  const menuItems = useMemo<MenuItem[]>(() => {
    const addressTotal = 1 + deliveryAddressCount;
    return [
      { icon: 'person-outline', label: 'Personal Details', route: 'PersonalDetails' },
      {
        icon: 'document-text-outline',
        label: 'Subscription Details',
        route: 'Subscription',
        sub: `Next Renewal: ${getRenewalFullLabel()}`,
      },
      {
        icon: 'location-outline',
        label: 'Saved Addresses',
        route: 'SavedAddresses',
        sub: `${addressTotal} address${addressTotal === 1 ? '' : 'es'}`,
      },
      {
        icon: 'wallet-outline',
        label: 'Wallet & Payments',
        route: 'Wallet',
        sub: `₹${walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
      {
        icon: 'gift-outline',
        label: 'Referral & Rewards',
        route: 'Referral',
        sub: 'Invite & Earn',
      },
      { icon: 'notifications-outline', label: 'Notifications', route: 'Notifications' },
      { icon: 'headset-outline', label: 'Help & Support', route: 'Support' },
      { icon: 'settings-outline', label: 'Settings', route: 'Settings' },
    ];
  }, [deliveryAddressCount, walletBalance]);

  const handleMenuPress = (route: MenuRoute) => {
    if (route === 'Notifications') {
      navigation.getParent()?.navigate('Home', { screen: 'Notifications' });
      return;
    }
    navigation.navigate(route);
  };

  const handleLogout = async () => {
    await logout();
    navigation.getParent()?.getParent()?.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Splash' }] }),
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.topBar, { paddingHorizontal: horizontalPadding }]}>
        <Text style={styles.pageTitle}>Profile</Text>
        <Pressable
          style={styles.settingsBtn}
          onPress={() => navigation.navigate('Settings')}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPadding }]}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user?.name ?? '')}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{user?.name || '—'}</Text>
            <Text style={styles.phone}>{user?.phone ? `+91 ${user.phone}` : '—'}</Text>
            <View style={styles.planRow}>
              <View style={styles.planMeta}>
                <Ionicons name="time-outline" size={14} color={colors.muted} />
                <Text style={styles.planText}>{getPlanLabel(activePlan)}</Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.green} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            </View>
          </View>
        </View>

        {menuItems.map((item) => (
          <Pressable key={item.label} style={styles.menuCard} onPress={() => handleMenuPress(item.route)}>
            <View style={styles.menuLeft}>
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={20} color={colors.text} />
              </View>
              <View style={styles.menuCopy}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.sub ? <Text style={styles.menuSub}>{item.sub}</Text> : null}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}

        <Pressable style={styles.logoutCard} onPress={() => void handleLogout()}>
          <View style={styles.menuLeft}>
            <View style={[styles.menuIcon, styles.logoutIcon]}>
              <Ionicons name="log-out-outline" size={20} color={colors.orange} />
            </View>
            <Text style={styles.logoutLabel}>Logout</Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingBottom: 32, gap: 10 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.md,
    marginBottom: 6,
    ...shadow.subtle,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: colors.onPrimary },
  profileInfo: { flex: 1, minWidth: 0 },
  name: { fontSize: 18, fontWeight: '800', color: colors.text },
  phone: { fontSize: 13, color: colors.muted, marginTop: 4 },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 8,
  },
  planMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  planText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: colors.greenDark },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    ...shadow.subtle,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  menuCopy: { flex: 1, minWidth: 0 },
  menuLabel: { fontWeight: '700', fontSize: 14, color: colors.text },
  menuSub: { fontSize: 12, color: colors.muted, marginTop: 3, fontWeight: '500' },
  logoutCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginTop: 4,
    ...shadow.subtle,
  },
  logoutIcon: { backgroundColor: colors.orangeLight },
  logoutLabel: { fontWeight: '700', fontSize: 14, color: colors.orange },
});
