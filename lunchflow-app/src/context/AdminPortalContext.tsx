import { createContext, ReactNode, useContext } from 'react';
import { AdminPage } from '../components/AdminSidebar';

type AdminPortalContextValue = {
  navigate: (page: AdminPage) => void;
};

const AdminPortalContext = createContext<AdminPortalContextValue | null>(null);

export function AdminPortalProvider({ navigate, children }: { navigate: (page: AdminPage) => void; children: ReactNode }) {
  return <AdminPortalContext.Provider value={{ navigate }}>{children}</AdminPortalContext.Provider>;
}

export function useAdminPortalNav(): AdminPortalContextValue | null {
  return useContext(AdminPortalContext);
}
