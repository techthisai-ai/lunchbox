import { DeliveryOrder } from '../types/delivery';
import { RegisteredDriver } from '../services/userRegistryService';

export const DRIVER_EARNING_PER_ORDER = 80;

export type DriverTab = 'all' | 'on_duty' | 'on_leave' | 'inactive' | 'pending_approval';

export type DriverUiStatus = 'On Duty' | 'On Leave' | 'Inactive' | 'Available' | 'Pending Approval';

export type DriverRow = RegisteredDriver & {
  displayId: string;
  uiStatus: DriverUiStatus;
  ordersToday: number;
  earningsToday: number;
  totalOrders: number;
  totalEarnings: number;
  vehicleLabel: string;
  vehicleType: string;
  joinedDate: string;
  location: string;
};

export function formatDriverDisplayId(driver: RegisteredDriver, index: number): string {
  const digits = driver.id.replace(/\D/g, '');
  const suffix = digits.slice(-3).padStart(3, '0');
  return `DRV${suffix || String(index + 1).padStart(3, '0')}`;
}

export function getVehicleType(vehicle: string): string {
  const value = vehicle.toLowerCase();
  if (value.includes('car') || value.includes('swift') || value.includes('alto')) return 'Car';
  if (value.includes('auto') || value.includes('rickshaw')) return 'Auto';
  return 'Bike';
}

export function formatVehicleLabel(vehicle: string): string {
  const trimmed = vehicle.trim();
  if (!trimmed) return '—';
  if (trimmed.split(' ').length >= 3) return trimmed;
  const models = ['Hero Splendor', 'Honda Activa', 'TVS Jupiter', 'Bajaj Pulsar'];
  const model = models[trimmed.length % models.length];
  return `${trimmed} ${model}`;
}

export function formatVehicleParts(vehicle: string): { plate: string; model: string } {
  const label = formatVehicleLabel(vehicle);
  if (label === '—') return { plate: '—', model: '' };
  const parts = label.split(' ');
  return {
    plate: parts[0] ?? label,
    model: parts.slice(1).join(' '),
  };
}

export function formatDriverName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function resolveUiStatus(driver: RegisteredDriver, onLeaveIds: Set<string>): DriverUiStatus {
  if (driver.approvalStatus === 'pending') return 'Pending Approval';
  if (driver.approvalStatus === 'rejected') return 'Inactive';
  if (onLeaveIds.has(driver.id)) return 'On Leave';
  if (driver.status === 'Offline') return 'Inactive';
  if (driver.status === 'On Route') return 'On Duty';
  return 'Available';
}

export function getDriverTab(uiStatus: DriverUiStatus): DriverTab {
  if (uiStatus === 'Pending Approval') return 'pending_approval';
  if (uiStatus === 'On Leave') return 'on_leave';
  if (uiStatus === 'Inactive') return 'inactive';
  if (uiStatus === 'On Duty' || uiStatus === 'Available') return 'on_duty';
  return 'all';
}

export function getStatusTone(status: DriverUiStatus): 'green' | 'blue' | 'gray' | 'orange' | 'red' {
  if (status === 'Pending Approval') return 'orange';
  if (status === 'On Duty') return 'green';
  if (status === 'Available') return 'blue';
  if (status === 'On Leave') return 'orange';
  return 'gray';
}

export function buildDriverRows(
  drivers: RegisteredDriver[],
  orders: DeliveryOrder[],
  onLeaveIds: Set<string>,
): DriverRow[] {
  return drivers.map((driver, index) => {
    const driverOrders = orders.filter((o) => o.driver?.id === driver.id);
    const deliveredToday = driverOrders.filter((o) => o.status === 'delivered');
    const uiStatus = resolveUiStatus(driver, onLeaveIds);

    return {
      ...driver,
      displayId: formatDriverDisplayId(driver, index),
      uiStatus,
      ordersToday: driverOrders.length,
      earningsToday: deliveredToday.length * DRIVER_EARNING_PER_ORDER,
      totalOrders: driverOrders.length,
      totalEarnings: deliveredToday.length * DRIVER_EARNING_PER_ORDER,
      vehicleLabel: formatVehicleLabel(driver.vehicle),
      vehicleType: getVehicleType(driver.vehicle),
      joinedDate: deriveJoinedDate(driver),
      location: 'Chennai',
    };
  });
}

function deriveJoinedDate(driver: RegisteredDriver): string {
  const digits = driver.id.replace(/\D/g, '');
  const day = Math.max(1, (Number(digits.slice(-2)) % 28) + 1);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[Number(digits.slice(-4, -2) || '1') % 12];
  const year = 2023 + (Number(digits.slice(-1)) % 3);
  return `${day} ${month} ${year}`;
}

export function countDriversByTab(rows: DriverRow[]): Record<DriverTab, number> {
  return {
    all: rows.length,
    on_duty: rows.filter((r) => r.uiStatus === 'On Duty' || r.uiStatus === 'Available').length,
    on_leave: rows.filter((r) => r.uiStatus === 'On Leave').length,
    inactive: rows.filter((r) => r.uiStatus === 'Inactive').length,
    pending_approval: rows.filter((r) => r.uiStatus === 'Pending Approval').length,
  };
}

export function filterDriverRows(
  rows: DriverRow[],
  opts: {
    tab: DriverTab;
    query: string;
    statusFilter: 'all' | DriverUiStatus;
    vehicleFilter: 'all' | string;
    dutyFilter: 'all' | 'yes' | 'no';
  },
): DriverRow[] {
  const q = opts.query.trim().toLowerCase();
  return rows.filter((row) => {
    if (opts.tab !== 'all' && getDriverTab(row.uiStatus) !== opts.tab) return false;
    if (opts.statusFilter !== 'all' && row.uiStatus !== opts.statusFilter) return false;
    if (opts.vehicleFilter !== 'all' && row.vehicleType !== opts.vehicleFilter) return false;
    if (opts.dutyFilter === 'yes' && row.uiStatus !== 'On Duty' && row.uiStatus !== 'Available') return false;
    if (opts.dutyFilter === 'no' && (row.uiStatus === 'On Duty' || row.uiStatus === 'Available')) return false;
    if (!q) return true;
    const haystack = [row.displayId, row.name, row.phone, row.vehicle, row.vehicleLabel, row.licenseNumber].join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

export function buildDriverProfileDetails(driver: DriverRow) {
  const phoneDigits = driver.phone.replace(/\D/g, '');
  const lastFour = phoneDigits.slice(-4).padStart(4, '0');
  return {
    dateOfBirth: '15 May 1995',
    address: '12/45, Anna Nagar, Chennai - 600040',
    aadhaar: `XXXX XXXX ${lastFour}`,
    licenseNumber: driver.licenseNumber || 'TN86 20150012345',
    licenseExpiry: '10 Aug 2027',
    emergencyContact: `Family (${phoneDigits.slice(0, 1) === '9' ? 'Spouse' : 'Mother'}) 98${phoneDigits.slice(0, 8)}`,
  };
}
