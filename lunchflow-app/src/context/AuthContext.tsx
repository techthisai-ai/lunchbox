import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { AuthUser, DEMO_ADMIN, UserRole } from '../constants/auth';
import {
  loginAdmin as loginAdminService,
  loginDriver as loginDriverService,
  logoutUser,
  registerCustomer as registerCustomerService,
  registerDriver as registerDriverService,
  sendCustomerOtp,
  subscribeToAuthState,
  verifyCustomerOtp,
  getPendingCustomerOtpForDev,
  CustomerRegistration,
  DriverRegistration,
  RegistrationRequiredError,
} from '../services/authService';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  loginAsAdmin: (email: string, password: string) => Promise<string | null>;
  loginAsDriver: (phone: string) => Promise<string | null>;
  sendCustomerOtp: (phone: string) => Promise<string | null>;
  loginAsCustomer: (otp: string) => Promise<{ error: string | null; user?: AuthUser }>;
  registerCustomer: (data: CustomerRegistration) => Promise<string | null>;
  registerDriver: (data: DriverRegistration) => Promise<string | null>;
  logout: () => Promise<void>;
  role: UserRole | null;
  getDevOtpHint: () => string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function registrationRequiredCode(error: unknown): string | null {
  if (error instanceof RegistrationRequiredError) {
    return error.kind === 'customer' ? 'REGISTER_REQUIRED' : 'DRIVER_REGISTER_REQUIRED';
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return subscribeToAuthState((profile) => {
      setUser((current) => {
        if (profile) return profile;
        if (current?.role === 'customer' || current?.role === 'driver') return current;
        if (current?.id === DEMO_ADMIN.id) return current;
        return null;
      });
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      role: user?.role ?? null,
      getDevOtpHint: () => getPendingCustomerOtpForDev(),
      loginAsAdmin: async (email, password) => {
        if (!email.trim() || !password) return 'Enter email and password';
        try {
          const profile = await loginAdminService(email, password);
          setUser(profile);
          return null;
        } catch (error) {
          return error instanceof Error ? error.message : 'Login failed';
        }
      },
      loginAsDriver: async (phone) => {
        if (!phone.trim()) return 'Enter mobile number';
        try {
          const profile = await loginDriverService(phone);
          setUser(profile);
          return null;
        } catch (error) {
          const code = registrationRequiredCode(error);
          if (code) return code;
          return error instanceof Error ? error.message : 'Login failed';
        }
      },
      sendCustomerOtp: async (phone) => {
        if (!phone.trim()) return 'Enter your mobile number';
        try {
          await sendCustomerOtp(phone);
          return null;
        } catch (error) {
          const code = registrationRequiredCode(error);
          if (code) return code;
          return error instanceof Error ? error.message : 'Could not send OTP';
        }
      },
      loginAsCustomer: async (otp) => {
        try {
          const profile = await verifyCustomerOtp(otp);
          setUser(profile);
          return { error: null, user: profile };
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'Login failed' };
        }
      },
      registerCustomer: async (data) => {
        try {
          const profile = await registerCustomerService(data);
          setUser(profile);
          return null;
        } catch (error) {
          return error instanceof Error ? error.message : 'Registration failed';
        }
      },
      registerDriver: async (data) => {
        try {
          const profile = await registerDriverService(data);
          setUser(profile);
          return null;
        } catch (error) {
          return error instanceof Error ? error.message : 'Registration failed';
        }
      },
      logout: async () => {
        await logoutUser();
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
