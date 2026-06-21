import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../constants/theme';

export type AdminPage =
  | 'dashboard'
  | 'orders'
  | 'customers'
  | 'drivers'
  | 'reports'
  | 'salary'
  | 'expenses';

export const ADMIN_PAGE_LABELS: Record<AdminPage, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  customers: 'Customers',
  drivers: 'Drivers',
  reports: 'Reports',
  salary: 'Salary',
  expenses: 'Expenses',
};

type NavItem = {
  id: AdminPage;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { id: 'orders', label: 'Orders', icon: 'receipt' },
  { id: 'customers', label: 'Customers', icon: 'people' },
  { id: 'drivers', label: 'Drivers', icon: 'bicycle' },
  { id: 'reports', label: 'Reports', icon: 'bar-chart' },
  { id: 'salary', label: 'Salary', icon: 'wallet' },
  { id: 'expenses', label: 'Expenses', icon: 'cash' },
];

type Props = {
  active: AdminPage;
  adminName?: string;
  onNavigate: (page: AdminPage) => void;
  onLogout: () => void;
  variant?: 'fixed' | 'overlay';
};

export function AdminSidebar({ active, adminName, onNavigate, onLogout, variant = 'fixed' }: Props) {
  return (
    <View style={[styles.sidebar, variant === 'overlay' && styles.sidebarOverlay]}>
      <View style={styles.brand}>
        <Text style={styles.brandTitle}>
          Lunch<Text style={styles.brandAccent}>Flow</Text>
        </Text>
        <Text style={styles.brandSub}>Admin Portal</Text>
      </View>

      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const selected = active === item.id;
          return (
            <Pressable
              key={item.id}
              style={[styles.navItem, selected && styles.navItemActive]}
              onPress={() => onNavigate(item.id)}
            >
              <Ionicons name={item.icon} size={20} color={selected ? colors.orange : colors.muted} />
              <Text style={[styles.navLabel, selected && styles.navLabelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        {adminName ? <Text style={styles.adminName}>{adminName}</Text> : null}
        <Pressable style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.red} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    backgroundColor: colors.dark,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  sidebarOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    height: '100%',
    zIndex: 2,
    borderRightWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  brand: { paddingHorizontal: spacing.sm, marginBottom: spacing.xl },
  brandTitle: { fontSize: 22, fontWeight: '800', color: colors.white },
  brandAccent: { color: colors.orange },
  brandSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4, fontWeight: '600' },
  nav: { flex: 1, gap: 6 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
  },
  navItemActive: { backgroundColor: 'rgba(242, 56, 152, 0.18)' },
  navLabel: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.72)' },
  navLabelActive: { color: colors.white, fontWeight: '700' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: 10,
  },
  adminName: { fontSize: 13, fontWeight: '700', color: colors.white },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  logoutText: { fontSize: 13, fontWeight: '700', color: colors.red },
});
