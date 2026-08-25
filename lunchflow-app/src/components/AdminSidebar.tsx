import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../constants/theme';
import { ChefQueenLogo } from './ChefQueenLogo';

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
  bg: colors.bg,
  border: colors.border,
  text: colors.text,
  textMuted: colors.muted,
  hover: colors.greenLight,
  surface: colors.white,
  activeBg: colors.orange,
  activeText: colors.onPrimary,
};

type Props = {
  active: AdminPage;
  onNavigate: (page: AdminPage) => void;
  variant?: 'fixed' | 'overlay';
};

export function AdminSidebar({ active, onNavigate, variant = 'fixed' }: Props) {
  const isDesktopFixed = variant === 'fixed' && Platform.OS === 'web';

  return (
    <View
      style={[
        styles.sidebar,
        isDesktopFixed && styles.sidebarDesktopFixed,
        variant === 'overlay' && styles.sidebarOverlay,
      ]}
    >
      <View style={styles.brandCard}>
        <ChefQueenLogo variant="splash" height={64} />
      </View>

      {isDesktopFixed ? (
        <View style={styles.navFill}>
          {NAV_ITEMS.map((item) => {
            const selected = active === item.id;
            return (
              <Pressable
                key={item.id}
                style={({ pressed, hovered }) => [
                  styles.navItem,
                  styles.navItemFill,
                  selected && styles.navItemActive,
                  !selected && (pressed || hovered) && styles.navItemHover,
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
      ) : (
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    flex: 1,
    flexDirection: 'column',
    backgroundColor: SIDEBAR.bg,
    borderRightWidth: 1,
    borderRightColor: SIDEBAR.border,
    alignSelf: 'stretch',
    flexShrink: 0,
    overflow: 'hidden',
    height: '100%',
  },
  sidebarDesktopFixed: Platform.OS === 'web'
    ? {
        height: '100%' as unknown as number,
        minHeight: '100%' as unknown as number,
      }
    : {},
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
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: SIDEBAR.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: SIDEBAR.border,
    flexShrink: 0,
  },
  navScroll: {
    flex: 1,
    minHeight: 0,
  },
  navFill: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: spacing.sm,
    paddingTop: 4,
    paddingBottom: spacing.sm,
    gap: 8,
    justifyContent: 'space-between',
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SIDEBAR.border,
    backgroundColor: SIDEBAR.surface,
    flexShrink: 0,
  },
  navItemFill: {
    flex: 1,
    minHeight: 44,
    maxHeight: 72,
  },
  navItemHover: {
    backgroundColor: SIDEBAR.hover,
    borderColor: SIDEBAR.border,
  },
  navItemActive: {
    backgroundColor: SIDEBAR.activeBg,
    borderColor: colors.orange,
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
});
