import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, palette, radius, shadow, spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { DriverTabParamList, RootStackParamList } from '../../navigation/types';
import { listDriverCompletedToday } from '../../services/orderHubService';
import { getDriverRatingSummary } from '../../services/ratingService';
import { openSupportCall } from '../../services/supportService';
import { loadDriverByPhone } from '../../services/userRegistryService';
import { DRIVER_EARNING_PER_ORDER } from '../../utils/adminDriverHelpers';

const PROFILE_AVATAR = require('../../../assets/route-logo.png');

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<DriverTabParamList, 'DriverProfile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function formatDriverDisplayId(driverId: string): string {
  const digits = driverId.replace(/\D/g, '');
  const suffix = digits.slice(-3).padStart(3, '0');
  return `DRV${suffix || '001'}`;
}

function formatPhone(phone?: string): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `+91 ${digits}` : phone;
}

function ratingCaption(average: string, reviewCount: number): string {
  if (reviewCount <= 0) return 'New';
  const value = Number(average);
  if (value >= 4.5) return 'Excellent';
  if (value >= 4) return 'Good';
  if (value >= 3) return 'Fair';
  return 'Needs work';
}

const menuItems = [
  { icon: 'time-outline' as const, label: 'Delivery History', action: 'history' as const },
  { icon: 'headset-outline' as const, label: 'Help & Support', action: 'support' as const },
];

export function DriverProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
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
    void openSupportCall();
  };

  const driverId = user?.id ? formatDriverDisplayId(user.id) : '—';
  const vehiclePlate = user?.vehicle?.trim() || '—';
  const ratingLabel = ratingCaption(ratingAverage, reviewCount);
  const online = driverStatus !== 'Offline';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#F3F6E8', '#E4EBD2', '#DCE6C8']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 18 }]}
        >
          <Ionicons name="leaf-outline" size={56} color="rgba(81,91,47,0.12)" style={styles.heroLeaf} />
          <View style={styles.avatarRing}>
            <Image source={PROFILE_AVATAR} style={styles.avatarImage} resizeMode="cover" accessibilityLabel="Chef Queen" />
          </View>
          <Text style={styles.name}>{user?.name || '—'}</Text>
          <Text style={styles.phone}>{formatPhone(user?.phone)}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, !online && styles.statusDotOff]} />
            <Text style={[styles.statusText, !online && styles.statusTextOff]}>
              Driver • {driverStatus}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.statsGrid}>
            <StatCard
              icon="id-card-outline"
              iconBg="#E8ECD8"
              iconColor={palette.forest}
              label="Driver ID"
              value={driverId}
            />
            <StatCard
              icon="car-outline"
              iconBg="#E8ECD8"
              iconColor={palette.forest}
              label="Vehicle"
              value={vehiclePlate}
            />
            <StatCard
              icon="star"
              iconBg={colors.orangeLight}
              iconColor={colors.orange}
              label="Rating"
              value={`${ratingAverage} ★`}
              valueColor={colors.orange}
              caption={`(${ratingLabel})`}
            />
            <StatCard
              icon="cash-outline"
              iconBg={colors.orangeLight}
              iconColor={colors.orange}
              label="Today's Earnings"
              value={`₹${earningsToday.toLocaleString('en-IN')}`}
              valueColor={colors.orange}
            />
          </View>

          <Text style={styles.section}>Account</Text>
          {menuItems.map((item) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
              onPress={() => handleMenuPress(item.action)}
            >
              <View style={styles.menuLeft}>
                <View style={styles.menuIcon}>
                  <Ionicons name={item.icon} size={20} color={palette.forest} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.forest} />
            </Pressable>
          ))}

          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Logout"
          >
            <Text style={styles.logoutText}>Logout</Text>
            <Ionicons name="log-out-outline" size={18} color={colors.orange} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  valueColor,
  caption,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  valueColor?: string;
  caption?: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]} numberOfLines={2}>
        {value}
      </Text>
      {caption ? <Text style={styles.statCaption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 36 },
  hero: {
    alignItems: 'center',
    paddingBottom: 28,
    paddingHorizontal: spacing.md,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  heroLeaf: { position: 'absolute', top: 18, right: 18 },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.white,
    overflow: 'hidden',
    ...shadow.card,
  },
  avatarImage: { width: '100%', height: '100%' },
  name: { fontSize: 22, fontWeight: '800', color: palette.forest, marginTop: 14 },
  phone: { fontSize: 14, color: palette.forest, marginTop: 4, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#5C9A4A' },
  statusDotOff: { backgroundColor: colors.muted },
  statusText: { fontSize: 13, fontWeight: '600', color: '#5C9A4A' },
  statusTextOff: { color: colors.muted },
  body: { padding: spacing.md, gap: 12, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%',
    flexGrow: 1,
    minWidth: '46%',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    ...shadow.card,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statValue: { fontSize: 16, fontWeight: '800', color: palette.forest, marginTop: 4 },
  statCaption: { fontSize: 11, fontWeight: '600', color: colors.muted, marginTop: 2 },
  section: { fontSize: 16, fontWeight: '800', color: palette.forest, marginTop: 6 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    ...shadow.card,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: 15, fontWeight: '700', color: palette.forest },
  logoutBtn: {
    marginTop: 8,
    alignSelf: 'center',
    minWidth: 168,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.orange,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: colors.orange },
  pressed: { opacity: 0.88 },
});
