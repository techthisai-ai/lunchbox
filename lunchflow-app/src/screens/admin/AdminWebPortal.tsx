import { ComponentType, useCallback, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { ADMIN_PAGE_LABELS, ADMIN_SIDEBAR_WIDTH, AdminPage, AdminSidebar } from '../../components/AdminSidebar';
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
import { AdminSlotsScreen } from './AdminSlotsScreen';
import { AdminTelecallersScreen } from './AdminTelecallersScreen';

type Props = {
  onLogout: () => void;
};

const PAGES: Record<AdminPage, ComponentType<object>> = {
  dashboard: AdminDashboardScreen,
  orders: AdminOrdersScreen,
  customers: AdminCustomersScreen,
  drivers: AdminDriversScreen,
  telecallers: AdminTelecallersScreen,
  slots: AdminSlotsScreen,
  reports: AdminReportsScreen,
  salary: AdminSalaryScreen,
  expenses: AdminExpensesScreen,
};

export function AdminWebPortal({ onLogout }: Props) {
  const { logout } = useAuth();
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
        <View style={styles.sidebarDock}>
          <AdminSidebar active={page} onNavigate={handleNavigate} onLogout={handleLogout} />
        </View>
      ) : null}

      <View style={[styles.main, !isSidebarCollapsed && styles.mainWithSidebar]}>
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
    backgroundColor: colors.bg,
    ...(Platform.OS === 'web'
      ? {
          minHeight: '100vh' as unknown as number,
          height: '100vh' as unknown as number,
          overflow: 'hidden' as const,
        }
      : {
          flexDirection: 'row' as const,
        }),
  },
  sidebarDock: {
    width: ADMIN_SIDEBAR_WIDTH,
    flexShrink: 0,
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed' as const,
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 20,
          height: '100vh' as unknown as number,
        }
      : {
          alignSelf: 'stretch',
        }),
  },
  main: {
    flex: 1,
    minWidth: 0,
    ...(Platform.OS === 'web'
      ? {
          overflow: 'hidden' as const,
          height: '100vh' as unknown as number,
        }
      : {}),
  },
  mainWithSidebar: Platform.OS === 'web'
    ? {
        marginLeft: ADMIN_SIDEBAR_WIDTH,
      }
    : {},
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
