import { ComponentType, useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { ADMIN_PAGE_LABELS, AdminPage, AdminSidebar } from '../../components/AdminSidebar';
import { AdminMobileHeader } from '../../components/admin/AdminMobileHeader';
import { colors } from '../../constants/theme';
import { AdminPortalProvider } from '../../context/AdminPortalContext';
import { useAuth } from '../../context/AuthContext';
import { useAdminLayout } from '../../hooks/useAdminLayout';
import { AdminCustomersScreen } from './AdminCustomersScreen';
import { AdminDashboardScreen } from './AdminDashboardScreen';
import { AdminDriversScreen } from './AdminDriversScreen';
import { AdminExpensesScreen } from './AdminExpensesScreen';
import { AdminOrdersScreen } from './AdminOrdersScreen';
import { AdminReportsScreen } from './AdminReportsScreen';
import { AdminSalaryScreen } from './AdminSalaryScreen';

type Props = {
  onLogout: () => void;
};

const PAGES: Record<AdminPage, ComponentType<object>> = {
  dashboard: AdminDashboardScreen,
  orders: AdminOrdersScreen,
  customers: AdminCustomersScreen,
  drivers: AdminDriversScreen,
  reports: AdminReportsScreen,
  salary: AdminSalaryScreen,
  expenses: AdminExpensesScreen,
};

export function AdminWebPortal({ onLogout }: Props) {
  const { user, logout } = useAuth();
  const [page, setPage] = useState<AdminPage>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const { isSidebarCollapsed, showMobileHeader } = useAdminLayout();
  const Screen = PAGES[page];

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  const handleNavigate = useCallback(
    (next: AdminPage) => {
      setPage(next);
      setMenuOpen(false);
    },
    [],
  );

  return (
    <View style={styles.layout}>
      {!isSidebarCollapsed ? (
        <AdminSidebar active={page} adminName={user?.name} onNavigate={handleNavigate} onLogout={handleLogout} />
      ) : null}

      <View style={styles.main}>
        {showMobileHeader ? (
          <AdminMobileHeader title={ADMIN_PAGE_LABELS[page]} onMenuPress={() => setMenuOpen(true)} />
        ) : null}
        <AdminPortalProvider navigate={handleNavigate}>
          <Screen />
        </AdminPortalProvider>
      </View>

      {isSidebarCollapsed ? (
        <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
          <View style={styles.drawerRoot}>
            <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
            <AdminSidebar
              variant="overlay"
              active={page}
              adminName={user?.name}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bg,
    minHeight: '100%' as unknown as number,
  },
  main: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  drawerRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 1,
  },
});
