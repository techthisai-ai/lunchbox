import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import {
  AuthUser,
  UserRole,
  validateAdminLogin,
  validateCustomerLogin,
  validateDriverLogin,
} from '../constants/auth';

type AuthContextValue = {
  user: AuthUser | null;
  loginAsAdmin: (email: string, password: string) => string | null;
  loginAsDriver: (phone: string, password: string) => string | null;
  loginAsCustomer: (phone: string, otp: string) => string | null;
  logout: () => void;
  role: UserRole | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      loginAsAdmin: (email, password) => {
        const account = validateAdminLogin(email, password);
        if (!account) return 'Invalid admin email or password';
        setUser(account);
        return null;
      },
      loginAsDriver: (phone, password) => {
        const account = validateDriverLogin(phone, password);
        if (!account) return 'Invalid driver phone or password';
        setUser(account);
        return null;
      },
      loginAsCustomer: (phone, otp) => {
        const account = validateCustomerLogin(phone, otp);
        if (!account) return 'Enter valid 10-digit mobile and 4-digit OTP';
        setUser(account);
        return null;
      },
      logout: () => setUser(null),
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
