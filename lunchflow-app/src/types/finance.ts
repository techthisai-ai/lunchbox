export type SalaryStatus = 'paid' | 'unpaid';

export type SalaryRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  month: string;
  amount: number;
  status: SalaryStatus;
  paidAt?: string;
  createdAt: string;
};

export type ExpenseCategory = 'fuel' | 'packaging' | 'maintenance' | 'misc';

export type PaymentMethod = 'cash' | 'upi' | 'card';

export type ExpenseRecord = {
  id: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  date: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  createdAt: string;
};
