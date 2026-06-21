export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getSubscriptionRenewalLabel(): string {
  const renew = new Date();
  renew.setMonth(renew.getMonth() + 1);
  renew.setDate(28);
  if (renew.getTime() < Date.now()) {
    renew.setMonth(renew.getMonth() + 1);
  }
  return formatShortDate(renew);
}

export function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = d.getDay();
  const diff = weekday === 0 ? 6 : weekday - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

export function resolveHistoryDateKey(entry: { dateKey?: string; date: string }): string {
  if (entry.dateKey) return entry.dateKey;
  const parsed = Date.parse(entry.date);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return todayKey();
}

export function isHistoryToday(dateKey: string): boolean {
  return dateKey === todayKey();
}

export function isHistoryThisWeek(dateKey: string): boolean {
  const entryDate = parseDateKey(dateKey);
  const weekStart = startOfWeekMonday(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return entryDate >= weekStart && entryDate <= weekEnd;
}

export function isHistoryThisMonth(dateKey: string): boolean {
  const now = new Date();
  const entryDate = parseDateKey(dateKey);
  return entryDate.getFullYear() === now.getFullYear() && entryDate.getMonth() === now.getMonth();
}

export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return formatShortDate(new Date(timestamp));
}
