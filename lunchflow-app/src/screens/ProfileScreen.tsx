import { CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { ProfileStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

const menuItems = [
  { icon: 'person-outline' as const, label: 'Personal Details' },
  { icon: 'document-text-outline' as const, label: 'Subscription Details', sub: 'School · ₹699/mo', route: 'Subscription' as const },
  { icon: 'location-outline' as const, label: 'Saved Addresses', sub: '2 addresses' },
  { icon: 'gift-outline' as const, label: 'Referral & Rewards', route: 'Referral' as const },
  { icon: 'wallet-outline' as const, label: 'Wallet & Payments', route: 'Wallet' as const },
  { icon: 'help-circle-outline' as const, label: 'Help & Support', route: 'Support' as const },
  { icon: 'settings-outline' as const, label: 'Settings' },
];

export function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const rootNav = navigation.getParent()?.getParent()?.getParent();

  const handleLogout = () => {
    logout();
    rootNav?.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Splash' }] }));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>PS</Text>
        </View>
        <Text style={styles.name}>{user?.name ?? 'Priya Sharma'}</Text>
        <Text style={styles.phone}>+91 {user?.phone ?? '9876543210'}</Text>
      </View>
      <ScrollView>
        {menuItems.map((item) => (
          <Pressable
            key={item.label}
            style={styles.menuItem}
            onPress={() => {
              if (item.route) navigation.navigate(item.route);
            }}
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
  container: { flex: 1, backgroundColor: colors.white },
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
