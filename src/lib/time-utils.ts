/**
 * Shared time-range helpers that support overnight slots (e.g. 22:00 → 04:00).
 *
 * An overnight slot is one where startTime >= endTime as HH:MM strings,
 * meaning it wraps past midnight. Equal start/end is treated as invalid
 * (zero-length) and rejected upstream by validation.
 */

/** Convert "HH:MM" to minutes since midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** True when a time-range wraps past midnight (e.g. 22:00 → 04:00). */
export function isOvernight(startTime: string, endTime: string): boolean {
  return startTime > endTime;
}

/**
 * Do two HH:MM time ranges overlap?
 * Handles any combination of normal and overnight ranges.
 *
 * Each range is split into sub-ranges on a [0, 1440] number line:
 *   normal  → [[start, end]]
 *   overnight → [[start, 1440], [0, end]]
 * Then pairwise sub-range overlap is checked.
 */
export function timeRangesOverlap(
  s1: string, e1: string,
  s2: string, e2: string,
): boolean {
  const expand = (s: string, e: string): [number, number][] => {
    const sm = toMinutes(s), em = toMinutes(e);
    return sm < em ? [[sm, em]] : [[sm, 1440], [0, em]];
  };
  const r1 = expand(s1, e1);
  const r2 = expand(s2, e2);
  return r1.some(([a, b]) => r2.some(([c, d]) => a < d && c < b));
}

/**
 * Does the outer HH:MM range fully contain the inner HH:MM range?
 *
 * For bookings: the outer range is the configured time-slot,
 * the inner range is the requested booking window.
 */
export function timeRangeContains(
  outerStart: string, outerEnd: string,
  innerStart: string, innerEnd: string,
): boolean {
  const os = toMinutes(outerStart), oe = toMinutes(outerEnd);
  const is_ = toMinutes(innerStart), ie = toMinutes(innerEnd);

  if (os < oe) {
    // Normal outer slot
    if (is_ < ie) {
      // Normal inner: simple containment
      return is_ >= os && ie <= oe;
    }
    // Overnight inner can never fit inside a normal outer
    return false;
  }

  // Overnight outer slot: covers [os, 1440) ∪ [0, oe)
  if (is_ < ie) {
    // Normal inner must fit entirely in one of the two sub-ranges
    return (is_ >= os && ie <= 1440) || (is_ >= 0 && ie <= oe);
  }
  // Overnight inner: both the late-night part and early-morning part must fit
  return is_ >= os && ie <= oe;
}

/**
 * Check if a booking's time-of-day (extracted from full Date) overlaps
 * with a slot's HH:MM range, properly handling overnight slots.
 *
 * bookingStartMin / bookingEndMin are minutes since midnight derived from the
 * booking start/end Date objects.
 */
export function bookingOverlapsSlot(
  bookingStartMin: number,
  bookingEndMin: number,
  slotStartMin: number,
  slotEndMin: number,
): boolean {
  const expand = (s: number, e: number): [number, number][] =>
    s < e ? [[s, e]] : [[s, 1440], [0, e]];

  const bookingRanges = expand(bookingStartMin, bookingEndMin);
  const slotRanges = expand(slotStartMin, slotEndMin);
  return bookingRanges.some(([a, b]) => slotRanges.some(([c, d]) => a < d && c < b));
}
