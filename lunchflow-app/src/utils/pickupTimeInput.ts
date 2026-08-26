export type DayPeriod = 'AM' | 'PM';

export function splitTime24Hour(time24: string): { clock: string; period: DayPeriod } {
  const [hourPart, minutePart] = time24.split(':');
  const hours = Number(hourPart);
  const minutes = Number(minutePart ?? 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return { clock: '', period: 'AM' };
  }
  const period: DayPeriod = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return { clock: `${hour12}:${String(minutes).padStart(2, '0')}`, period };
}

/** Converts 12-hour clock (e.g. 1:00 PM) to 24-hour HH:mm storage. */
export function toTime24Hour(clock: string, period: DayPeriod): string | null {
  const match = clock.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 1 || hours > 12) return null;

  if (period === 'AM') {
    hours = hours === 12 ? 0 : hours;
  } else {
    hours = hours === 12 ? 12 : hours + 12;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function isValid12HourClock(value: string): boolean {
  return /^([1-9]|1[0-2]):[0-5]\d$/.test(value.trim());
}
