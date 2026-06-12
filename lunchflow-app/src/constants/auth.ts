export type UserRole = 'customer' | 'driver' | 'admin';

export type AuthUser = {
  id: string;
  role: UserRole;
  name: string;
  email?: string;
  phone?: string;
};

export const DEMO_CREDENTIALS = {
  admin: {
    email: 'admin@lunchflow.com',
    password: 'admin123',
    name: 'Admin User',
  },
  driver: {
    phone: '9123456789',
    password: 'driver123',
    name: 'Rajesh Kumar',
    vehicle: 'DL 4C AB 1234',
  },
  customer: {
    phone: '9876543210',
    otp: '4729',
  },
} as const;

export function validateAdminLogin(email: string, password: string): AuthUser | null {
  const { admin } = DEMO_CREDENTIALS;
  if (email.trim().toLowerCase() === admin.email && password === admin.password) {
    return { id: 'ADM-001', role: 'admin', name: admin.name, email: admin.email };
  }
  return null;
}

export function validateDriverLogin(phone: string, password: string): AuthUser | null {
  const { driver } = DEMO_CREDENTIALS;
  const normalized = phone.replace(/\D/g, '').slice(-10);
  const expected = driver.phone;
  if (normalized === expected && password === driver.password) {
    return { id: 'DRV-001', role: 'driver', name: driver.name, phone: driver.phone };
  }
  return null;
}

export function validateCustomerLogin(phone: string, otp: string): AuthUser | null {
  const normalized = phone.replace(/\D/g, '').slice(-10);
  if (normalized.length === 10 && otp.length === 4) {
    return { id: 'CUS-001', role: 'customer', name: 'Priya Sharma', phone: normalized };
  }
  return null;
}
