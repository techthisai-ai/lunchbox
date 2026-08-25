import { ComponentType, useCallback, useEffect, useState } from 'react';
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
import { AdminPromoPostsScreen } from './AdminPromoPostsScreen';

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
  const [promoPostsOpen, setPromoPostsOpen] = useState(false);
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

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      rootOverflow: root?.style.overflow ?? '',
      rootHeight: root?.style.height ?? '',
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (root) {
      root.style.overflow = 'hidden';
      root.style.height = '100%';
    }

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      if (root) {
        root.style.overflow = prev.rootOverflow;
        root.style.height = prev.rootHeight;
      }
    };
  }, []);

  return (
    <View style={styles.layout}>
      {!isSidebarCollapsed ? (
        <View style={styles.sidebarDock}>
          <AdminSidebar active={page} onNavigate={handleNavigate} />
        </View>
      ) : null}

      <View style={[styles.main, !isSidebarCollapsed && styles.mainWithSidebar]}>
        {showMobileHeader ? (
          <AdminMobileHeader
            title={promoPostsOpen ? 'Ad Posts' : ADMIN_PAGE_LABELS[page]}
            onMenuPress={() => setMenuOpen(true)}
          />
        ) : null}
        <AdminPortalProvider
          navigate={handleNavigate}
          logout={handleLogout}
          openPromoPosts={() => setPromoPostsOpen(true)}
        >
          <View style={styles.screenWrap}>
            {promoPostsOpen ? <AdminPromoPostsScreen onClose={() => setPromoPostsOpen(false)} /> : <Screen />}
          </View>
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
    ...(Platform.OS === 'web'
      ? {
          minHeight: '100%' as unknown as number,
          height: '100%' as unknown as number,
          width: '100%' as unknown as number,
          overflow: 'hidden' as const,
        }
      : {}),
  },
  sidebarDock: {
    width: ADMIN_SIDEBAR_WIDTH,
    flexShrink: 0,
    alignSelf: 'stretch',
    ...(Platform.OS === 'web'
      ? {
          height: '100%' as unknown as number,
        }
      : {}),
  },
  main: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    ...(Platform.OS === 'web'
      ? {
          overflow: 'hidden' as const,
          height: '100%' as unknown as number,
        }
      : {}),
  },
  mainWithSidebar: {},
  screenWrap: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
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
