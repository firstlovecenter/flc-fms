/** Maximum calendar days ahead a regular booking start may be scheduled. */
export const MAX_BOOKING_ADVANCE_DAYS = 30;

export const MAX_BOOKING_ADVANCE_HOURS = MAX_BOOKING_ADVANCE_DAYS * 24;

/** Ceremony bookings (weddings, naming ceremonies) may be scheduled up to a year ahead. */
export const MAX_CEREMONY_BOOKING_ADVANCE_DAYS = 365;

export const MAX_CEREMONY_BOOKING_ADVANCE_HOURS = MAX_CEREMONY_BOOKING_ADVANCE_DAYS * 24;

/** Minimum hours before slot start that a booking may be placed. */
export const MIN_BOOKING_NOTICE_HOURS = 18;

export const MAX_BOOKING_ADVANCE_ERROR =
  "Bookings can only be made up to 1 month in advance. Please select an earlier date.";

export const MAX_CEREMONY_BOOKING_ADVANCE_ERROR =
  "Ceremony bookings can only be made up to 1 year in advance. Please select an earlier date.";

export function isBeyondMaxBookingAdvance(
  date: Date,
  now = new Date(),
  maxDays: number = MAX_BOOKING_ADVANCE_DAYS,
): boolean {
  const latest = new Date(now);
  latest.setDate(latest.getDate() + maxDays);
  latest.setHours(23, 59, 59, 999);
  return date.getTime() > latest.getTime();
}
