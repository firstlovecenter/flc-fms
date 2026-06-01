import { format, startOfDay } from "date-fns";

/** `YYYY-MM-DD` from HTML `<input type="date">`. */
export const DUTY_DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a calendar date string without UTC midnight shift.
 * `new Date("2024-06-01")` is UTC midnight; this uses local noon on that day.
 */
export function parseDutyDateInput(value: string): Date {
  if (!DUTY_DATE_INPUT_PATTERN.test(value)) {
    throw new Error(`Invalid duty date: ${value}`);
  }
  return new Date(`${value}T12:00:00`);
}

/** Local start-of-day for Prisma `@db.Date` storage and lookups. */
export function toDutyDateOnly(date: Date): Date {
  return startOfDay(date);
}

/** `YYYY-MM-DD` input → date stored on duty logs. */
export function dutyDateFromInput(value: string): Date {
  return toDutyDateOnly(parseDutyDateInput(value));
}

export function formatDutyDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}
