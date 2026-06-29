export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(month: string): string {
  const [year, monthPart] = month.split('-');
  const date = new Date(Number(year), Number(monthPart) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function buildMonthFilterOptions(extraMonths: string[] = [], range = 24): { id: string; label: string }[] {
  const months = new Set(extraMonths);
  const now = new Date();
  for (let i = 0; i < range; i += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  return [...months]
    .sort((a, b) => b.localeCompare(a))
    .map((month) => ({ id: month, label: formatMonthLabel(month) }));
}
