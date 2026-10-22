// Date-only arithmetic on UTC midnights. Never mixes in the device's local time zone.

export const MS_PER_DAY = 86_400_000;

/** Parses a strict `YYYY-MM-DD` string to a UTC timestamp, or null if invalid. */
export function parseISODate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const time = Date.UTC(year, month - 1, day);
  const check = new Date(time);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }
  return time;
}

export function toISODate(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

export function addDays(time: number, days: number): number {
  return time + days * MS_PER_DAY;
}

/** Number of days from start to end, counting both the first and the last day. */
export function daysInclusive(start: number, end: number): number {
  return Math.round((end - start) / MS_PER_DAY) + 1;
}

export interface Tenure {
  years: number;
  months: number;
  days: number;
}

/** Calendar years/months/days of service, treating the end date as worked. */
export function calendarTenure(start: number, endInclusive: number): Tenure {
  const s = new Date(start);
  const e = new Date(addDays(endInclusive, 1));
  let years = e.getUTCFullYear() - s.getUTCFullYear();
  let months = e.getUTCMonth() - s.getUTCMonth();
  let days = e.getUTCDate() - s.getUTCDate();
  if (days < 0) {
    months -= 1;
    days += new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), 0)).getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}
