import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

const SIDEBAR_WIDTH = 252;

export const ADMIN_SIDEBAR_WIDTH = SIDEBAR_WIDTH;

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
  onNavigate: (page: AdminPage) => void;
  onLogout: () => void;
  variant?: 'fixed' | 'overlay';
};

export function AdminSidebar({ active, onNavigate, onLogout, variant = 'fixed' }: Props) {
  return (
    <LinearGradient
      colors={[SIDEBAR.bg, SIDEBAR.bgSoft, '#1E0F33']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.sidebar, variant === 'overlay' && styles.sidebarOverlay]}
    >
      <View style={styles.brandCard}>
        <LogoMark size={48} />
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

      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
      </ScrollView>

      <View style={styles.footer}>
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
    width: SIDEBAR_WIDTH,
    flex: 1,
    flexDirection: 'column',
    borderRightWidth: 1,
    borderRightColor: SIDEBAR.border,
    alignSelf: 'stretch',
    flexShrink: 0,
    overflow: 'hidden',
    height: '100%',
    ...(Platform.OS === 'web'
      ? {
          minHeight: '100%' as unknown as number,
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
  navScroll: {
    flex: 1,
    minHeight: 0,
  },
  navContent: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 6,
    paddingBottom: 8,
  },
  navItem: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SIDEBAR.border,
    backgroundColor: SIDEBAR.surface,
    flexShrink: 0,
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
    fontSize: 17,
    fontWeight: '700',
    color: SIDEBAR.text,
    textAlign: 'center',
    lineHeight: 22,
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
    zIndex: 2,
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
