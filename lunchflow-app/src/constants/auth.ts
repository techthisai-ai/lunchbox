export type UserRole = 'customer' | 'driver' | 'admin';

export type AuthUser = {
  id: string;
  role: UserRole;
  name: string;
  email?: string;
  phone?: string;
  vehicle?: string;
  driverApprovalStatus?: 'pending' | 'approved' | 'rejected';
};

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

export function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

/** Admin demo login only */
export const DEMO_ADMIN = {
  email: 'admin@lunchflow.com',
  password: 'admin123',
  name: 'Admin User',
  id: 'ADM-001',
} as const;

export function isDemoAdminLogin(email: string, password: string): boolean {
  return email.trim().toLowerCase() === DEMO_ADMIN.email && password === DEMO_ADMIN.password;
}

export function driverEmailFromPhone(phone: string): string {
  return `${normalizePhone(phone)}@driver.lunchflow.app`;
}
