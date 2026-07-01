import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { getInitials } from '../../constants/auth';
import { colors, radius, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { DriverTabParamList, RootStackParamList } from '../../navigation/types';
import { listDriverCompletedToday } from '../../services/orderHubService';
import { getDriverRatingSummary } from '../../services/ratingService';
import { openSupportCall } from '../../services/supportService';
import { loadDriverByPhone } from '../../services/userRegistryService';
import { DRIVER_EARNING_PER_ORDER } from '../../utils/adminDriverHelpers';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<DriverTabParamList, 'DriverProfile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function formatDriverDisplayId(driverId: string): string {
  const digits = driverId.replace(/\D/g, '');
  const suffix = digits.slice(-3).padStart(3, '0');
  return `DRV${suffix || '001'}`;
}

const menuItems = [
  { icon: 'time-outline' as const, label: 'Delivery History', action: 'history' as const },
  { icon: 'help-circle-outline' as const, label: 'Help & Support', action: 'support' as const },
  { icon: 'lock-closed-outline' as const, label: 'Change Password', action: 'password' as const },
];

export function DriverProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<Nav>();
  const [earningsToday, setEarningsToday] = useState(0);
  const [ratingAverage, setRatingAverage] = useState('5.0');
  const [reviewCount, setReviewCount] = useState(0);
  const [driverStatus, setDriverStatus] = useState('Online');

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) {
        setEarningsToday(0);
        setRatingAverage('5.0');
        setReviewCount(0);
        return;
      }

      Promise.all([
        listDriverCompletedToday(user.id),
        getDriverRatingSummary(user.id),
        user.phone ? loadDriverByPhone(user.phone) : Promise.resolve(null),
      ]).then(([todayOrders, ratingSummary, driverRecord]) => {
        setEarningsToday(todayOrders.length * DRIVER_EARNING_PER_ORDER);
        setRatingAverage(ratingSummary.average);
        setReviewCount(ratingSummary.reviewCount);
        const status = driverRecord?.status ?? 'Available';
        setDriverStatus(status === 'Offline' ? 'Offline' : 'Online');
      });
    }, [user?.id, user?.phone]),
  );

  const handleLogout = async () => {
    await logout();
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Splash' }] }));
  };

  const handleMenuPress = (action: (typeof menuItems)[number]['action']) => {
    if (action === 'history') {
      navigation.navigate('DriverDeliveries');
      return;
    }
    if (action === 'support') {
      void openSupportCall();
      return;
    }
    navigation.navigate('DriverChangePassword');
  };

  const driverId = user?.id ? formatDriverDisplayId(user.id) : '—';
  const ratingValue =
    reviewCount > 0 ? `${ratingAverage} (${reviewCount})` : `${ratingAverage} (—)`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(user?.name ?? '')}</Text>
        </View>
        <Text style={styles.name}>{user?.name || '—'}</Text>
        <Text style={styles.phone}>{user?.phone ? `+91 ${user.phone}` : '—'}</Text>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, driverStatus === 'Offline' && styles.statusDotOff]} />
          <Text style={styles.statusText}>Driver · {driverStatus}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          <Card flat style={styles.statCard}>
            <Text style={styles.statLabel}>Driver ID</Text>
            <Text style={styles.statValue}>{driverId}</Text>
          </Card>
          <Card flat style={styles.statCard}>
            <Text style={styles.statLabel}>Vehicle</Text>
            <Text style={styles.statValue} numberOfLines={2}>
              {user?.vehicle || '—'}
            </Text>
          </Card>
          <Card flat style={styles.statCard}>
            <Text style={styles.statLabel}>Rating</Text>
            <Text style={styles.statValue}>{ratingValue}</Text>
          </Card>
          <Card flat style={styles.statCard}>
            <Text style={styles.statLabel}>Today's Earnings</Text>
            <Text style={[styles.statValue, styles.earnings]}>
              ₹{earningsToday.toLocaleString('en-IN')}
            </Text>
          </Card>
        </View>

        <Text style={styles.section}>Account</Text>
        {menuItems.map((item) => (
          <Pressable key={item.label} style={styles.menuItem} onPress={() => handleMenuPress(item.action)}>
            <View style={styles.menuLeft}>
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon} size={18} color={colors.text} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}

        <Button title="Logout" variant="danger" onPress={handleLogout} style={styles.logoutBtn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.greenLight,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: colors.green },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 12 },
  phone: { fontSize: 13, color: colors.muted, marginTop: 4, fontWeight: '600' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  statusDotOff: { backgroundColor: colors.muted },
  statusText: { fontSize: 12, fontWeight: '700', color: colors.text },
  scroll: { padding: spacing.md, paddingBottom: 28, gap: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '48%', flexGrow: 1, padding: spacing.md, minWidth: '46%' },
  statLabel: { fontSize: 11, color: colors.muted, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 6 },
  earnings: { color: colors.green },
  section: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 6 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  logoutBtn: { marginTop: spacing.sm },
});
