import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExpenseCategoryDef, ExpenseRecord, SalaryRecord } from '../types/finance';
import { syncDocument } from './firestoreSync';
import { loadRegisteredDrivers } from './userRegistryService';

const SALARIES_KEY = '@lunchflow_salaries';
const EXPENSES_KEY = '@lunchflow_expenses';
const EXPENSE_CATEGORIES_KEY = '@lunchflow_expense_categories';

const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategoryDef[] = [
  { id: 'fuel', label: 'Fuel' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'misc', label: 'Miscellaneous' },
];

function slugifyCategoryId(label: string): string {
  const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || `cat-${Date.now()}`;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function seedSalaries(): Promise<SalaryRecord[]> {
  const month = currentMonth();
  const drivers = await loadRegisteredDrivers();
  return drivers.map((driver, index) => ({
    id: `SAL-${driver.id}-${month}`,
    employeeId: driver.id,
    employeeName: driver.name,
    role: 'Driver',
    month,
    amount: 18000 + index * 1500,
    status: index % 2 === 0 ? ('paid' as const) : ('unpaid' as const),
    ...(index % 2 === 0 ? { paidAt: new Date().toISOString() } : {}),
    createdAt: new Date().toISOString(),
  }));
}

function offsetDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function offsetTimestamp(daysAgo: number, hours: number, minutes: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function seedExpenses(): ExpenseRecord[] {
  return [
    {
      id: 'EXP-FUEL-1',
      category: 'fuel',
      title: 'Diesel refill',
      amount: 3200,
      date: offsetDate(0),
      notes: 'Vehicle fuel expense',
      paymentMethod: 'cash',
      createdAt: offsetTimestamp(0, 9, 30),
    },
    {
      id: 'EXP-PKG-1',
      category: 'packaging',
      title: 'Lunch boxes batch',
      amount: 1800,
      date: offsetDate(1),
      notes: 'New lunch boxes packing',
      paymentMethod: 'cash',
      createdAt: offsetTimestamp(1, 16, 15),
    },
    {
      id: 'EXP-MNT-1',
      category: 'maintenance',
      title: 'Bike service',
      amount: 950,
      date: offsetDate(2),
      notes: 'Monthly bike maintenance',
      paymentMethod: 'cash',
      createdAt: offsetTimestamp(2, 11, 20),
    },
    {
      id: 'EXP-MISC-1',
      category: 'misc',
      title: 'Stationery',
      amount: 420,
      date: offsetDate(3),
      notes: 'Office stationery items',
      paymentMethod: 'cash',
      createdAt: offsetTimestamp(3, 14, 45),
    },
  ];
}

export async function listSalaryRecords(): Promise<SalaryRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(SALARIES_KEY);
    if (raw) return JSON.parse(raw) as SalaryRecord[];
  } catch {
    // fall through
  }
  const seeded = await seedSalaries();
  await AsyncStorage.setItem(SALARIES_KEY, JSON.stringify(seeded));
  for (const record of seeded) await syncDocument('salaries', record.id, record);
  return seeded;
}

export async function listExpenseRecords(): Promise<ExpenseRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(EXPENSES_KEY);
    if (raw) {
      const records = JSON.parse(raw) as ExpenseRecord[];
      const seedIds = ['EXP-FUEL-1', 'EXP-PKG-1', 'EXP-MNT-1', 'EXP-MISC-1'];
      const freshSeeds = seedExpenses();
      const hasSeedRecords = seedIds.every((id) => records.some((record) => record.id === id));
      if (hasSeedRecords) {
        const next = records.map((record) => {
          const fresh = freshSeeds.find((seed) => seed.id === record.id);
          return fresh ? { ...record, ...fresh } : record;
        });
        await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(next));
        return next;
      }
      return records;
    }
  } catch {
    // fall through
  }
  const seeded = seedExpenses();
  await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(seeded));
  for (const record of seeded) await syncDocument('expenses', record.id, record);
  return seeded;
}

export async function markSalaryPaid(recordId: string): Promise<void> {
  const records = await listSalaryRecords();
  const next = records.map((r) =>
    r.id === recordId ? { ...r, status: 'paid' as const, paidAt: new Date().toISOString() } : r,
  );
  await AsyncStorage.setItem(SALARIES_KEY, JSON.stringify(next));
  const updated = next.find((r) => r.id === recordId);
  if (updated) await syncDocument('salaries', recordId, updated);
}

export async function addSalaryRecord(input: {
  employeeName: string;
  role: string;
  month: string;
  amount: number;
}): Promise<SalaryRecord> {
  const employeeId = `EMP-${Date.now()}`;
  const record: SalaryRecord = {
    id: `SAL-${Date.now()}`,
    employeeId,
    employeeName: input.employeeName.trim(),
    role: input.role.trim() || 'Employee',
    month: input.month,
    amount: input.amount,
    status: 'unpaid',
    createdAt: new Date().toISOString(),
  };
  const records = await listSalaryRecords();
  const next = [record, ...records];
  await AsyncStorage.setItem(SALARIES_KEY, JSON.stringify(next));
  await syncDocument('salaries', record.id, record);
  return record;
}

export async function syncSalariesFromDrivers(month = currentMonth()): Promise<number> {
  const drivers = await loadRegisteredDrivers();
  const records = await listSalaryRecords();
  const existing = new Set(records.filter((record) => record.month === month).map((record) => record.employeeId));
  const next = [...records];
  let added = 0;

  for (const [index, driver] of drivers.entries()) {
    if (existing.has(driver.id)) continue;
    const record: SalaryRecord = {
      id: `SAL-${driver.id}-${month}`,
      employeeId: driver.id,
      employeeName: driver.name,
      role: index % 3 === 1 ? 'Delivery Boy' : 'Driver',
      month,
      amount: 15000 + index * 1500,
      status: 'unpaid',
      createdAt: new Date().toISOString(),
    };
    next.push(record);
    await syncDocument('salaries', record.id, record);
    added += 1;
  }

  if (added > 0) {
    await AsyncStorage.setItem(SALARIES_KEY, JSON.stringify(next));
  }
  return added;
}

export async function addExpenseRecord(input: Omit<ExpenseRecord, 'id' | 'createdAt'>): Promise<ExpenseRecord> {
  const record: ExpenseRecord = {
    ...input,
    id: `EXP-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const records = await listExpenseRecords();
  const next = [record, ...records];
  await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(next));
  await syncDocument('expenses', record.id, record);
  return record;
}

export async function listExpenseCategories(): Promise<ExpenseCategoryDef[]> {
  try {
    const raw = await AsyncStorage.getItem(EXPENSE_CATEGORIES_KEY);
    if (raw) return JSON.parse(raw) as ExpenseCategoryDef[];
  } catch {
    // fall through
  }
  await AsyncStorage.setItem(EXPENSE_CATEGORIES_KEY, JSON.stringify(DEFAULT_EXPENSE_CATEGORIES));
  return DEFAULT_EXPENSE_CATEGORIES;
}

export async function addExpenseCategory(label: string): Promise<ExpenseCategoryDef> {
  const trimmed = label.trim();
  if (!trimmed) {
    throw new Error('Enter a category name');
  }
  const categories = await listExpenseCategories();
  const normalized = trimmed.toLowerCase();
  if (categories.some((category) => category.label.toLowerCase() === normalized)) {
    throw new Error('Category already exists');
  }
  const baseId = slugifyCategoryId(trimmed);
  const id = categories.some((category) => category.id === baseId) ? `${baseId}-${Date.now()}` : baseId;
  const category = { id, label: trimmed };
  const next = [...categories, category];
  await AsyncStorage.setItem(EXPENSE_CATEGORIES_KEY, JSON.stringify(next));
  return category;
}

export async function countActiveSubscriptions(): Promise<number> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const subKeys = keys.filter((k) => k.startsWith('@lunchflow_subscription_') && !k.includes('history'));
    let active = 0;
    for (const key of subKeys) {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) continue;
      const record = JSON.parse(raw) as { status?: string };
      if (record.status === 'active') active += 1;
    }
    return active;
  } catch {
    return 0;
  }
}
