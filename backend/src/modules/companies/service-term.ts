import { ServiceBillingPeriod } from '../../common/enums/service-billing-period.enum.js';

export type AnnualServiceTerm = {
  startsYear: number;
  startedAt: string;
  expiresAt: string;
};

export function toDateOnly(value: Date | string): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayDateOnly() {
  return toDateOnly(new Date());
}

export function addDays(dateOnly: string, days: number) {
  const [year, month, day] = dateOnly.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + days);
  return toDateOnly(date);
}

export function daysUntil(expiresAt: string, from = todayDateOnly()) {
  const [ey, em, ed] = expiresAt.slice(0, 10).split('-').map(Number);
  const [fy, fm, fd] = from.split('-').map(Number);
  const end = Date.UTC(ey, (em || 1) - 1, ed || 1);
  const start = Date.UTC(fy, (fm || 1) - 1, fd || 1);
  return Math.round((end - start) / 86_400_000);
}

export function isAnnualBilling(period?: ServiceBillingPeriod | string) {
  return period === ServiceBillingPeriod.ANNUAL;
}

export function isServiceTermExpired(expiresAt?: Date | string | null) {
  if (!expiresAt) return false;
  return toDateOnly(expiresAt) < todayDateOnly();
}

export function isServiceTermActive(isActive: boolean, expiresAt?: Date | string | null) {
  return isActive && !isServiceTermExpired(expiresAt);
}

export function buildAnnualTerm(from = new Date(), termMonths = 12): AnnualServiceTerm {
  const started = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const expires = new Date(started);
  expires.setMonth(expires.getMonth() + termMonths);
  return {
    startsYear: started.getFullYear(),
    startedAt: toDateOnly(started),
    expiresAt: toDateOnly(expires),
  };
}
