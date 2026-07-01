import { createContext, ReactNode, useContext } from 'react';
import { AdminPage } from '../components/AdminSidebar';

type AdminPortalContextValue = {
  navigate: (page: AdminPage) => void;
  logout: () => void;
};

const AdminPortalContext = createContext<AdminPortalContextValue | null>(null);

export function AdminPortalProvider({
  navigate,
  logout,
  children,
}: {
  navigate: (page: AdminPage) => void;
  logout: () => void;
  children: ReactNode;
}) {
  return <AdminPortalContext.Provider value={{ navigate, logout }}>{children}</AdminPortalContext.Provider>;
}

export function useAdminPortalNav(): AdminPortalContextValue | null {
  return useContext(AdminPortalContext);
}
