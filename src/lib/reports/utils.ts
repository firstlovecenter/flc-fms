import { subMonths, startOfDay, endOfDay } from "date-fns";

export type ReportPeriod = "30d" | "90d" | "6m" | "12m" | "ytd" | "custom";

export interface DateRange {
  from: Date;
  to: Date;
}

export function resolveDateRange(period: ReportPeriod, from?: string, to?: string): DateRange {
  const now = new Date();
  if (period === "30d")  return { from: subMonths(now, 1),  to: now };
  if (period === "90d")  return { from: subMonths(now, 3),  to: now };
  if (period === "12m")  return { from: subMonths(now, 12), to: now };
  if (period === "ytd")  return { from: new Date(now.getFullYear(), 0, 1), to: now };
  if (period === "custom" && from && to) {
    return { from: startOfDay(new Date(from)), to: endOfDay(new Date(to)) };
  }
  // default: last 6 months
  return { from: subMonths(now, 6), to: now };
}
