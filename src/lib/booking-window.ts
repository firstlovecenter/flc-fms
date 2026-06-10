/** Maximum calendar days ahead a booking start may be scheduled. */
export const MAX_BOOKING_ADVANCE_DAYS = 30;

export const MAX_BOOKING_ADVANCE_HOURS = MAX_BOOKING_ADVANCE_DAYS * 24;

/** Minimum hours before slot start that a booking may be placed. */
export const MIN_BOOKING_NOTICE_HOURS = 18;

export const MAX_BOOKING_ADVANCE_ERROR =
  "Bookings can only be made up to 1 month in advance. Please select an earlier date.";

export function isBeyondMaxBookingAdvance(date: Date, now = new Date()): boolean {
  const latest = new Date(now);
  latest.setDate(latest.getDate() + MAX_BOOKING_ADVANCE_DAYS);
  latest.setHours(23, 59, 59, 999);
  return date.getTime() > latest.getTime();
}
