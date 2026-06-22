import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, palette, radius, shadow, spacing } from '../constants/theme';
import { LogoMark } from './LogoMark';

export type AdminPage =
  | 'dashboard'
  | 'orders'
  | 'customers'
  | 'drivers'
  | 'telecallers'
  | 'slots'
  | 'reports'
  | 'salary'
  | 'expenses';

export const ADMIN_PAGE_LABELS: Record<AdminPage, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  customers: 'Customers',
  drivers: 'Drivers',
  telecallers: 'Telecallers',
  slots: 'Slots & Pricing',
  reports: 'Reports',
  salary: 'Salary',
  expenses: 'Expenses',
};

type NavItem = {
  id: AdminPage;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'orders', label: 'Orders' },
  { id: 'customers', label: 'Customers' },
  { id: 'drivers', label: 'Drivers' },
  { id: 'telecallers', label: 'Telecallers' },
  { id: 'slots', label: 'Slots & Pricing' },
  { id: 'salary', label: 'Salary' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'reports', label: 'Reports' },
];

const SIDEBAR = {
  bg: palette.purple10,
  bgSoft: palette.purple10Soft,
  border: 'rgba(255, 255, 255, 0.12)',
  text: colors.onPrimary,
  textMuted: 'rgba(255, 255, 255, 0.62)',
  hover: 'rgba(255, 255, 255, 0.08)',
  surface: 'rgba(255, 255, 255, 0.1)',
  activeBg: palette.yellow30,
  activeText: palette.purple10,
};

type Props = {
  active: AdminPage;
  adminName?: string;
  onNavigate: (page: AdminPage) => void;
  onLogout: () => void;
  variant?: 'fixed' | 'overlay';
};

function getInitial(name?: string) {
  return (name?.trim().charAt(0) || 'A').toUpperCase();
}

export function AdminSidebar({ active, adminName, onNavigate, onLogout, variant = 'fixed' }: Props) {
  const displayName = adminName?.trim() || 'Admin User';

  return (
    <LinearGradient
      colors={[SIDEBAR.bg, SIDEBAR.bgSoft, '#1E0F33']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.sidebar, variant === 'overlay' && styles.sidebarOverlay]}
    >
      <View style={styles.brandCard}>
        <LogoMark size={38} />
        <View style={styles.brandText}>
          <Text style={styles.brandTitle}>
            Lunch<Text style={styles.brandAccent}>Flow</Text>
          </Text>
          <View style={styles.brandBadge}>
            <Ionicons name="shield-checkmark" size={9} color={SIDEBAR.activeText} />
            <Text style={styles.brandSub}>Admin Portal</Text>
          </View>
        </View>
      </View>

      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const selected = active === item.id;
          return (
            <Pressable
              key={item.id}
              style={({ pressed, hovered }) => [
                styles.navItem,
                selected && styles.navItemActive,
                !selected && (pressed || (Platform.OS === 'web' && hovered)) && styles.navItemHover,
              ]}
              onPress={() => onNavigate(item.id)}
            >
              <Text style={[styles.navLabel, selected && styles.navLabelActive]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitial(adminName)}</Text>
          </View>
          <View style={styles.userMeta}>
            <Text style={styles.adminName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.adminRole}>Administrator</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed, hovered }) => [
            styles.logoutBtn,
            (pressed || (Platform.OS === 'web' && hovered)) && styles.logoutBtnHover,
          ]}
          onPress={onLogout}
        >
          <Ionicons name="log-out-outline" size={16} color="#FF8FAB" />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 252,
    flexDirection: 'column',
    borderRightWidth: 1,
    borderRightColor: SIDEBAR.border,
    alignSelf: 'stretch',
    flexShrink: 0,
    ...(Platform.OS === 'web'
      ? {
          height: '100%' as unknown as number,
          minHeight: '100vh' as unknown as number,
        }
      : {}),
  },
  sidebarOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: '100%',
    zIndex: 2,
    borderRightWidth: 0,
    ...shadow.elevated,
  },
  brandCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: SIDEBAR.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: SIDEBAR.border,
    flexShrink: 0,
  },
  brandText: {
    flex: 1,
    minWidth: 0,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: SIDEBAR.text,
    letterSpacing: -0.3,
  },
  brandAccent: {
    color: palette.yellow30,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: SIDEBAR.activeBg,
  },
  brandSub: {
    fontSize: 8,
    color: SIDEBAR.activeText,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  nav: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    justifyContent: 'space-evenly',
    gap: 6,
  },
  navItem: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SIDEBAR.border,
    backgroundColor: SIDEBAR.surface,
  },
  navItemHover: {
    backgroundColor: SIDEBAR.hover,
    borderColor: SIDEBAR.border,
  },
  navItemActive: {
    backgroundColor: SIDEBAR.activeBg,
    borderColor: 'rgba(255, 240, 168, 0.45)',
  },
  navLabel: {
    width: '100%',
    fontSize: 14,
    fontWeight: '700',
    color: SIDEBAR.text,
    textAlign: 'center',
  },
  navLabelActive: {
    color: SIDEBAR.activeText,
    fontWeight: '800',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: SIDEBAR.border,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    flexShrink: 0,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: SIDEBAR.surface,
    borderWidth: 1,
    borderColor: SIDEBAR.border,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SIDEBAR.activeBg,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: SIDEBAR.activeText,
  },
  userMeta: {
    flex: 1,
    minWidth: 0,
  },
  adminName: {
    fontSize: 12,
    fontWeight: '800',
    color: SIDEBAR.text,
  },
  adminRole: {
    fontSize: 9,
    fontWeight: '600',
    color: SIDEBAR.textMuted,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(185, 28, 74, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 143, 171, 0.35)',
  },
  logoutBtnHover: {
    backgroundColor: 'rgba(185, 28, 74, 0.28)',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FF8FAB',
  },
});
