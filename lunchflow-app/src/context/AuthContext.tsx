import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { AuthUser, DEMO_ADMIN, UserRole } from '../constants/auth';
import {
  loginAdmin as loginAdminService,
  loginCustomer as loginCustomerService,
  loginDriver as loginDriverService,
  logoutUser,
  registerCustomer as registerCustomerService,
  registerDriver as registerDriverService,
  sendCustomerOtp,
  sendDriverOtp,
  subscribeToAuthState,
  verifyCustomerOtp,
  verifyDriverOtp,
  persistAuthSession,
  restoreAuthSession,
  CustomerRegistration,
  DriverRegistration,
  RegistrationRequiredError,
} from '../services/authService';
import { registerForPushNotifications } from '../services/pushNotificationService';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  loginAsAdmin: (email: string, password: string) => Promise<string | null>;
  loginAsCustomerPhone: (phone: string) => Promise<string | null>;
  loginAsDriver: (phone: string) => Promise<string | null>;
  sendCustomerOtp: (phone: string) => Promise<string | null>;
  sendDriverOtp: (phone: string) => Promise<string | null>;
  loginAsCustomer: (otp: string, phone?: string) => Promise<{ error: string | null; user?: AuthUser }>;
  loginAsDriverOtp: (otp: string, phone?: string) => Promise<{ error: string | null; user?: AuthUser }>;
  registerCustomer: (data: CustomerRegistration) => Promise<string | null>;
  registerDriver: (data: DriverRegistration) => Promise<string | null>;
  logout: () => Promise<void>;
  role: UserRole | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function registrationRequiredCode(error: unknown): string | null {
  if (error instanceof RegistrationRequiredError) {
    return error.kind === 'customer' ? 'REGISTER_REQUIRED' : 'DRIVER_REGISTER_REQUIRED';
  }
  return null;
}

function registerPushInBackground(phone?: string, name?: string) {
  if (!phone) return;
  registerForPushNotifications(phone, name).catch(() => {});
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    restoreAuthSession().then((restored) => {
      if (!cancelled && restored) {
        setUser((current) => current ?? restored);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    if (loading) return;
    persistAuthSession(user);
  }, [user, loading]);

  useEffect(() => {
    if (!user?.phone || (user.role !== 'customer' && user.role !== 'driver')) return;
    registerForPushNotifications(user.phone, user.name).catch(() => {});
  }, [user?.id, user?.phone, user?.role, user?.name]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      role: user?.role ?? null,
      loginAsAdmin: async (email, password) => {
        if (!email.trim() || !password) return 'Enter email and password';
        try {
          const profile = await loginAdminService(email, password);
          setUser(profile);
          await persistAuthSession(profile);
          return null;
        } catch (error) {
          return error instanceof Error ? error.message : 'Login failed';
        }
      },
      loginAsCustomerPhone: async (phone) => {
        if (!phone.trim()) return 'Enter mobile number';
        try {
          const profile = await loginCustomerService(phone);
          setUser(profile);
          registerPushInBackground(profile.phone, profile.name);
          return null;
        } catch (error) {
          const code = registrationRequiredCode(error);
          if (code) return code;
          return error instanceof Error ? error.message : 'Login failed';
        }
      },
      loginAsDriver: async (phone) => {
        if (!phone.trim()) return 'Enter mobile number';
        try {
          const profile = await loginDriverService(phone);
          setUser(profile);
          registerPushInBackground(profile.phone, profile.name);
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
      sendDriverOtp: async (phone) => {
        if (!phone.trim()) return 'Enter your mobile number';
        try {
          await sendDriverOtp(phone);
          return null;
        } catch (error) {
          const code = registrationRequiredCode(error);
          if (code) return code;
          return error instanceof Error ? error.message : 'Could not send OTP';
        }
      },
      loginAsCustomer: async (otp, phone) => {
        try {
          const profile = await verifyCustomerOtp(otp, phone);
          setUser(profile);
          registerPushInBackground(profile.phone, profile.name);
          return { error: null, user: profile };
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'Login failed' };
        }
      },
      loginAsDriverOtp: async (otp, phone) => {
        try {
          const profile = await verifyDriverOtp(otp, phone);
          setUser(profile);
          registerPushInBackground(profile.phone, profile.name);
          return { error: null, user: profile };
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'Login failed' };
        }
      },
      registerCustomer: async (data) => {
        try {
          const profile = await registerCustomerService(data);
          setUser(profile);
          registerPushInBackground(profile.phone, profile.name);
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
