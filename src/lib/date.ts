import { useEffect, useState } from 'react';

/** Formats a Date as YYYY-MM-DD in the device's local timezone (not UTC). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parses YYYY-MM-DD as a local-time date (new Date('YYYY-MM-DD') would parse it as UTC). */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Today's date as YYYY-MM-DD (local time). */
export function todayISO(): string {
  return toISODate(new Date());
}

/**
 * Today's date as YYYY-MM-DD, re-rendering when the day changes
 * (so a register left open past midnight stamps invoices with the new date).
 */
export function useToday(): string {
  const [today, setToday] = useState<string>(todayISO);

  useEffect(() => {
    const id = setInterval(() => {
      const now = todayISO();
      setToday(prev => (prev === now ? prev : now));
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  return today;
}
