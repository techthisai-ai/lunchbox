import { createContext, ReactNode, useContext } from 'react';
import { AdminPage } from '../components/AdminSidebar';

type AdminPortalContextValue = {
  navigate: (page: AdminPage) => void;
  logout: () => void;
  openPromoPosts: () => void;
};

const AdminPortalContext = createContext<AdminPortalContextValue | null>(null);

export function AdminPortalProvider({
  navigate,
  logout,
  openPromoPosts,
  children,
}: {
  navigate: (page: AdminPage) => void;
  logout: () => void;
  openPromoPosts: () => void;
  children: ReactNode;
}) {
  return (
    <AdminPortalContext.Provider value={{ navigate, logout, openPromoPosts }}>{children}</AdminPortalContext.Provider>
  );
}

export function useAdminPortalNav(): AdminPortalContextValue | null {
  return useContext(AdminPortalContext);
}
