import { InstallmentDue, InstallmentPlan } from '../types';
import { addMonths } from './serials';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Equal monthly dues (the last one absorbs the cents) starting on `firstDue`. */
export function buildSchedule(totalUSD: number, months: number, firstDue: string): InstallmentDue[] {
  const n = Math.max(1, Math.floor(months));
  const each = round2(totalUSD / n);
  return Array.from({ length: n }, (_, i) => ({
    dueDate: addMonths(firstDue, i),
    amountUSD: i === n - 1 ? round2(totalUSD - each * (n - 1)) : each,
    paidUSD: 0,
  }));
}

/** Applies a payment to the oldest unpaid dues first. */
export function applyPayment(plan: InstallmentPlan, amountUSD: number, date: string): InstallmentPlan {
  let left = round2(amountUSD);
  const schedule = plan.schedule.map(d => {
    const open = round2(d.amountUSD - d.paidUSD);
    if (left <= 0 || open <= 0) return d;
    const take = Math.min(open, left);
    left = round2(left - take);
    const paidUSD = round2(d.paidUSD + take);
    return { ...d, paidUSD, ...(paidUSD >= d.amountUSD ? { paidDate: date } : {}) };
  });
  const done = schedule.every(d => d.paidUSD >= d.amountUSD);
  return { ...plan, schedule, payments: [...plan.payments, { date, amountUSD: round2(amountUSD) }], status: done ? 'done' : 'active' };
}

export const remainingOf = (plan: InstallmentPlan) => round2(plan.schedule.reduce((s, d) => s + d.amountUSD - d.paidUSD, 0));

/** Dues whose date has passed and are not fully paid. */
export const overdueOf = (plan: InstallmentPlan, today: string) =>
  plan.schedule.filter(d => d.dueDate < today && d.paidUSD < d.amountUSD);

export const nextDueOf = (plan: InstallmentPlan) => plan.schedule.find(d => d.paidUSD < d.amountUSD);
