"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { requireStaff, requirePermission, requirePatron } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/redis";
import { headers } from "next/headers";
import { sendBookingConfirmationEmail, sendBookingApprovedEmail, sendBookingRejectedEmail } from "@/lib/notifications/email";
import { notifyBookingApproved, notifyBookingRejected, notifyBookingConfirmation, notifyFMBookingPending } from "@/lib/notifications/sms";
import { getFacilityMaintenanceConflict } from "./maintenance.actions";
import { timeRangeContains } from "@/lib/time-utils";

type AgreementTerm = "BOOKING_TERMS" | "ITEM_BOOKING_TERMS";

// Prisma interactive-transaction client type
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

const BookingSchema = z.object({
  facilityId:  z.string().min(1, "Facility is required"),
  category:    z.string().min(1, "Category is required"),
  title:       z.string().min(2).max(200),
  description: z.string().optional(),
  startTime:   z.coerce.date(),
  endTime:     z.coerce.date(),
  useAirConditioner: z.boolean().optional().default(false),
  notes:       z.string().optional(),
  acceptedTerms: z.array(z.enum(["BOOKING_TERMS", "ITEM_BOOKING_TERMS"]))
    .optional()
    .default([]),
}).refine(d => d.endTime > d.startTime, {
  message: "End time must be after start time",
  path: ["endTime"],
});

// Lead-time enforcement: bookings limited to 7 days ahead
// Constants: 1 week = 7 * 24 * 60 * 60 = 604,800 seconds = 7,200 minutes = 168 hours
const LEAD_TIME_HOURS = 168; // 7 days
const MIN_LEAD_TIME_HOURS = 0; // Start booking immediately (next available slot)

function canBookMondays(role: string) {
  return ["FACILITY_MANAGER", "BOOKING_MANAGER", "SUPER_ADMIN"].includes(role);
}

function canBypassLeadTime(role: string) {
  return canBookMondays(role);
}

function violatesLeadTime(startTime: Date, hours = LEAD_TIME_HOURS) {
  const now = Date.now();
  const bookingTime = startTime.getTime();
  // Violates if booking is in the past or more than 7 days ahead
  return bookingTime < now || bookingTime > now + hours * 3_600_000;
}

function getMissingFacilityTerms(
  facility: { requiresBookingTerms: boolean; requiresItemBookingTerms: boolean },
  acceptedTerms: AgreementTerm[]
) {
  const accepted = new Set(acceptedTerms);
  const missing: AgreementTerm[] = [];
  if (facility.requiresBookingTerms && !accepted.has("BOOKING_TERMS")) {
    missing.push("BOOKING_TERMS");
  }
  if (facility.requiresItemBookingTerms && !accepted.has("ITEM_BOOKING_TERMS")) {
    missing.push("ITEM_BOOKING_TERMS");
  }
  return missing;
}

/**
 * Acquires a PostgreSQL advisory lock scoped to a facility for the duration
 * of the current transaction. Prevents concurrent bookings racing past the
 * conflict check on the same facility.
 */
async function acquireFacilityLock(tx: Tx, facilityId: string) {
  // Convert facilityId string into a deterministic 64-bit integer for pg_advisory_xact_lock.
  // We fold the first 8 bytes of the CUID/UUID into an int8 via BigInt to avoid collisions.
  const hash = facilityId.split("").reduce((acc, ch) => (acc * 31n + BigInt(ch.charCodeAt(0))) & 0xFFFFFFFFFFFFFFFFn, 0n);
  const lockId = BigInt.asIntN(64, hash);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId})`;
}

function toTimeString(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

async function findApplicableTimeSlot(
  db: Tx | typeof prisma,
  facilityId: string,
  category: string,
  startTime: Date,
  endTime: Date,
) {
  const dayOfWeek = startTime.getDay();
  const start = toTimeString(startTime);
  const end = toTimeString(endTime);

  // Fetch all active slots for this day/category, then check containment in JS
  // so overnight slots (e.g. 22:00→04:00) are handled correctly.
  const candidates = await db.facilityTimeSlot.findMany({
    where: {
      facilityId,
      dayOfWeek,
      category,
      isActive: true,
    },
    orderBy: { startTime: "asc" },
  });

  return candidates.find((slot) =>
    timeRangeContains(slot.startTime, slot.endTime, start, end),
  ) ?? null;
}

/**
 * Computes the booking amount for a facility + category + time range.
 * Accepts either the global prisma client or a transaction client so it can
 * be called both inside and outside of a transaction.
 *
 * Pricing resolution order:
 *  1. slot.isFree → $0 base (+ optional AC fee)
 *  2. slot.pricePerHourOverride → use override rate
 *  3. FacilityPricing.price → use category base rate
 *  4. FacilityPricing.freeDays → zero out if booking day is in freeDays
 */
async function computeConfiguredBookingAmount(
  db: Tx | typeof prisma,
  facilityId: string,
  category: string,
  startTime: Date,
  endTime: Date,
  useAirConditioner = false,
) {
  const [pricing, facility, activeCategory] = await Promise.all([
    db.facilityPricing.findFirst({
      where: {
        facilityId,
        category,
        isActive: true,
      },
    }),
    db.facility.findUnique({ where: { id: facilityId }, select: { acUsageFee: true } }),
    db.bookingCategory.findFirst({ where: { slug: category, isActive: true }, select: { id: true } }),
  ]);

  if (!activeCategory) return { error: "This booking category is no longer available." as const };
  if (!pricing) return { error: "No pricing configured for this booking category." as const };

  const slot = await findApplicableTimeSlot(db, facilityId, category, startTime, endTime);
  if (!slot) return { error: "No category-specific slot mapping found for the selected date/time." as const };

  const acFee = useAirConditioner ? Number(facility?.acUsageFee ?? 0) : 0;

  if (slot.isFree) {
    return { totalAmount: acFee, unitPrice: 0, pricingSource: "SLOT_FREE" as const };
  }

  const day = startTime.getDay();
  const unitPrice =
    slot.pricePerHourOverride != null
      ? Number(slot.pricePerHourOverride)
      : Number(pricing.price);

  // Zero out base amount only for explicitly configured free days (per-category setting).
  // NOTE: Weekdays are NOT automatically free — pricing must be configured via freeDays
  // or a slot-level isFree/pricePerHourOverride.
  const baseAmount = pricing.freeDays.includes(day) ? 0 : unitPrice;
  const totalAmount = baseAmount + acFee;
  const pricingSource = slot.pricePerHourOverride != null ? "SLOT_OVERRIDE" as const : "CATEGORY_BASE" as const;

  return { totalAmount, unitPrice: baseAmount, pricingSource };
}

/**
 * Inside a transaction (after acquiring the advisory lock), count how many
 * active bookings already overlap with the requested time window.
 * Returns the count. Caller compares against the slot's maxBookings.
 */
async function countOverlappingBookings(
  tx: Tx,
  facilityId: string,
  startTime: Date,
  endTime: Date,
  excludeId?: string,
) {
  return tx.booking.count({
    where: {
      facilityId,
      deletedAt: null,
      status: { in: ["PENDING", "APPROVED"] },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
      AND: [
        { startTime: { lt: endTime } },
        { endTime:   { gt: startTime } },
      ],
    },
  });
}

// ── Create booking (staff) ────────────────────────────────────────────────────

export async function createStaffBooking(data: z.infer<typeof BookingSchema>) {
  const session  = await requirePermission("canCreateBookings");
  const validated = BookingSchema.parse(data);

  // Rate limit: 20 booking creations per staff member per 10 minutes
  const ip = headers().get("x-forwarded-for")?.split(",")[0] ?? session.sub;
  const { allowed: rlAllowed } = await rateLimit(`booking_create:${session.sub}:${ip}`, 20, 600);
  if (!rlAllowed) return { error: "Too many booking requests. Please wait a few minutes." };

  // Mondays are restricted for non-manager roles
  if (validated.startTime.getDay() === 1 && !canBookMondays(session.role)) {
    return { error: "Bookings cannot be made on Mondays. The office is closed on Mondays (Sabbath day)." };
  }

  if (violatesLeadTime(validated.startTime) && !canBypassLeadTime(session.role)) {
    return { error: "Bookings can only be made up to 7 days in advance. Please select a date within this week." };
  }

  const facility = await prisma.facility.findFirstOrThrow({
    where: { id: validated.facilityId, isActive: true },
  });

  const missingTerms = getMissingFacilityTerms(facility, validated.acceptedTerms ?? []);
  if (missingTerms.includes("BOOKING_TERMS")) {
    return { error: "You must agree to Booking Terms and Conditions before creating this booking." };
  }
  if (missingTerms.includes("ITEM_BOOKING_TERMS")) {
    return { error: "You must agree to Item Booking Terms before creating this booking." };
  }

  // Hard-lock: emergency maintenance (no scheduled window)
  if (facility.underMaintenance) {
    return { error: "This facility is currently under emergency maintenance and cannot be booked." };
  }

  // Scheduled maintenance: only blocked for the specific date window
  const maintConflict = await getFacilityMaintenanceConflict(
    validated.facilityId,
    validated.startTime,
    validated.endTime,
  );
  if (maintConflict) {
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return {
      error: `This facility is scheduled for maintenance from ${fmt(maintConflict.scheduledStart!)} to ${fmt(maintConflict.scheduledEnd!)}. Please choose dates outside this window.`,
    };
  }

  // Wrap conflict check + pricing computation + booking creation in a single transaction
  // with an advisory lock to prevent race conditions on concurrent bookings.
  type TxResult =
    | { booking: Awaited<ReturnType<typeof prisma.booking.create>> & { facility: { name: string } | null; user: { name: string; phone: string | null; email: string } | null } }
    | { error: string };

  const txResult: TxResult = await prisma.$transaction(async (tx): Promise<TxResult> => {
    await acquireFacilityLock(tx, validated.facilityId);

    // Recompute price inside the lock so it reflects any pricing changes
    // that may have occurred between the pre-flight checks above and now.
    const amountResult = await computeConfiguredBookingAmount(
      tx,
      validated.facilityId,
      validated.category,
      validated.startTime,
      validated.endTime,
      validated.useAirConditioner,
    );
    if ("error" in amountResult) return { error: amountResult.error! };

    // Check capacity: count overlapping bookings and compare to slot's maxBookings
    const slot = await findApplicableTimeSlot(tx, validated.facilityId, validated.category, validated.startTime, validated.endTime);
    const maxAllowed = slot?.maxBookings ?? 1;
    const overlapCount = await countOverlappingBookings(tx, validated.facilityId, validated.startTime, validated.endTime);
    if (overlapCount >= maxAllowed) {
      return { error: overlapCount >= 1 ? "This time slot is fully booked." : "Facility already has a booking for that time slot." };
    }

    const booking = await tx.booking.create({
      data: {
        facilityId:   validated.facilityId,
        userId:       session.sub,
        category:     validated.category,
        title:        validated.title,
        description:  validated.description,
        startTime:    validated.startTime,
        endTime:      validated.endTime,
        acRequested:  validated.useAirConditioner,
        notes:        validated.notes ?? null,
        totalAmount:  amountResult.totalAmount,
        resolvedUnitPrice: amountResult.unitPrice,
        resolvedPricingSource: amountResult.pricingSource,
        status:       session.role === "FACILITY_MANAGER" ? "APPROVED" : "PENDING",
      },
      include: { facility: true, user: true },
    });
    return { booking };
  });

  if ("error" in txResult) return { error: txResult.error };
  const { booking } = txResult;

  if (booking.user?.phone) {
    await notifyBookingConfirmation({
      phone:        booking.user.phone,
      bookingTitle: booking.title,
      startTime:    booking.startTime,
      facilityName: booking.facility?.name ?? "N/A",
    });
  }
  if (booking.user?.email) {
    await sendBookingConfirmationEmail({
      to:            booking.user.email,
      name:          booking.user.name,
      bookingTitle:  booking.title,
      facilityName:  booking.facility?.name ?? "N/A",
      startTime:     booking.startTime,
      endTime:       booking.endTime,
      totalAmount:   Number(booking.totalAmount),
    });
  }

  // Alert FMs for pending bookings (FM self-bookings are auto-approved, no alert needed)
  if (booking.status === "PENDING") {
    const fms = await prisma.user.findMany({
      where: { role: "FACILITY_MANAGER", isActive: true },
      select: { phone: true },
    });
    for (const fm of fms) {
      if (fm.phone) {
        await notifyFMBookingPending({
          phone:        fm.phone,
          bookedBy:     booking.user?.name ?? "Staff",
          bookingTitle: booking.title,
          facilityName: booking.facility?.name ?? "N/A",
          startTime:    booking.startTime,
        });
      }
    }
  }

  auditLog({ userId: session.sub, action: "CREATE_BOOKING", entity: "Booking", entityId: booking.id, after: booking });
  revalidatePath("/bookings");
  return { success: true, booking };
}

// ── Create booking (patron) ───────────────────────────────────────────────────

export async function createPatronBooking(data: z.infer<typeof BookingSchema>) {
  const session  = await requirePatron();
  const validated = BookingSchema.parse(data);

  // Rate limit: 10 booking creations per patron per 10 minutes
  const ip = headers().get("x-forwarded-for")?.split(",")[0] ?? session.sub;
  const { allowed: rlAllowed } = await rateLimit(`booking_create:${session.sub}:${ip}`, 10, 600);
  if (!rlAllowed) return { error: "Too many booking requests. Please wait a few minutes." };

  // Require email verification before allowing bookings
  const patron = await prisma.patron.findUnique({
    where: { id: session.sub },
    select: { isVerified: true },
  });
  if (!patron?.isVerified) {
    return { error: "Please verify your email address before making a booking." };
  }

  // Mondays are office off-days (Sabbath) — no bookings allowed
  if (validated.startTime.getDay() === 1) {
    return { error: "Bookings cannot be made on Mondays. The office is closed on Mondays (Sabbath day)." };
  }

  if (violatesLeadTime(validated.startTime)) {
    return { error: "Bookings can only be made up to 7 days in advance. Please select a date within this week." };
  }

  const facility = await prisma.facility.findFirstOrThrow({
    where: { id: validated.facilityId, isActive: true },
  });

  const missingTerms = getMissingFacilityTerms(facility, validated.acceptedTerms ?? []);
  if (missingTerms.includes("BOOKING_TERMS")) {
    return { error: "You must agree to Booking Terms and Conditions before creating this booking." };
  }
  if (missingTerms.includes("ITEM_BOOKING_TERMS")) {
    return { error: "You must agree to Item Booking Terms before creating this booking." };
  }

  // Hard-lock: emergency maintenance (no scheduled window)
  if (facility.underMaintenance) {
    return { error: "This facility is currently under emergency maintenance and cannot be booked." };
  }

  // Scheduled maintenance: only blocked for the specific date window
  const maintConflict = await getFacilityMaintenanceConflict(
    validated.facilityId,
    validated.startTime,
    validated.endTime,
  );
  if (maintConflict) {
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return {
      error: `This facility is scheduled for maintenance from ${fmt(maintConflict.scheduledStart!)} to ${fmt(maintConflict.scheduledEnd!)}. Please choose dates outside this window.`,
    };
  }

  type TxResult =
    | { booking: Awaited<ReturnType<typeof prisma.booking.create>> & { facility: { name: string } | null; patron: { name: string; phone: string | null; email: string } | null } }
    | { error: string };

  const txResult: TxResult = await prisma.$transaction(async (tx): Promise<TxResult> => {
    await acquireFacilityLock(tx, validated.facilityId);

    const amountResult = await computeConfiguredBookingAmount(
      tx,
      validated.facilityId,
      validated.category,
      validated.startTime,
      validated.endTime,
      validated.useAirConditioner,
    );
    if ("error" in amountResult) return { error: amountResult.error! };

    const slot = await findApplicableTimeSlot(tx, validated.facilityId, validated.category, validated.startTime, validated.endTime);
    const maxAllowed = slot?.maxBookings ?? 1;
    const overlapCount = await countOverlappingBookings(tx, validated.facilityId, validated.startTime, validated.endTime);
    if (overlapCount >= maxAllowed) {
      return { error: overlapCount >= 1 ? "This time slot is fully booked." : "Facility already has a booking for that time slot." };
    }

    const booking = await tx.booking.create({
      data: {
        facilityId:   validated.facilityId,
        patronId:     session.sub,
        category:     validated.category,
        title:        validated.title,
        description:  validated.description,
        startTime:    validated.startTime,
        endTime:      validated.endTime,
        acRequested:  validated.useAirConditioner,
        notes:        validated.notes ?? null,
        totalAmount:  amountResult.totalAmount,
        resolvedUnitPrice: amountResult.unitPrice,
        resolvedPricingSource: amountResult.pricingSource,
        status:       "PENDING",
      },
      include: { facility: true, patron: true },
    });
    return { booking };
  });

  if ("error" in txResult) return { error: txResult.error };
  const { booking } = txResult;

  if (booking.patron?.phone) {
    await notifyBookingConfirmation({
      phone:        booking.patron.phone,
      bookingTitle: booking.title,
      startTime:    booking.startTime,
      facilityName: booking.facility?.name ?? "N/A",
    });
  }
  if (booking.patron?.email) {
    await sendBookingConfirmationEmail({
      to:            booking.patron.email,
      name:          booking.patron.name,
      bookingTitle:  booking.title,
      facilityName:  booking.facility?.name ?? "N/A",
      startTime:     booking.startTime,
      endTime:       booking.endTime,
      totalAmount:   Number(booking.totalAmount),
    });
  }

  // Alert all FMs about the new pending patron booking
  const patronFMs = await prisma.user.findMany({
    where: { role: "FACILITY_MANAGER", isActive: true },
    select: { phone: true },
  });
  for (const fm of patronFMs) {
    if (fm.phone) {
      await notifyFMBookingPending({
        phone:        fm.phone,
        bookedBy:     booking.patron?.name ?? "Patron",
        bookingTitle: booking.title,
        facilityName: booking.facility?.name ?? "N/A",
        startTime:    booking.startTime,
      });
    }
  }

  auditLog({ userId: session.sub, action: "CREATE_PATRON_BOOKING", entity: "Booking", entityId: booking.id });
  revalidatePath("/bookings");
  return { success: true, booking };
}

const GuestBookingSchema = z.object({
  facilityId: z.string().min(1, "Facility is required"),
  category: z.string().min(1, "Category is required"),
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  useAirConditioner: z.boolean().optional().default(false),
  notes: z.string().optional(),
  guestName: z.string().min(2).max(120),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(9, "Phone number is required"),
  acceptedTerms: z.array(z.enum(["BOOKING_TERMS", "ITEM_BOOKING_TERMS"]))
    .optional()
    .default([]),
}).refine((d) => d.endTime > d.startTime, {
  message: "End time must be after start time",
  path: ["endTime"]});

export async function createGuestBooking(data: z.infer<typeof GuestBookingSchema>) {
  const validated = GuestBookingSchema.parse(data);

  // Rate limit: 5 guest bookings per IP per 10 minutes
  const ip = headers().get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { allowed: rlAllowed } = await rateLimit(`guest_booking:${ip}`, 5, 600);
  if (!rlAllowed) return { error: "Too many booking requests. Please wait a few minutes." };

  // Mondays are office off-days (Sabbath) — no bookings allowed
  if (validated.startTime.getDay() === 1) {
    return { error: "Bookings cannot be made on Mondays. The office is closed on Mondays (Sabbath day)." };
  }

  if (violatesLeadTime(validated.startTime)) {
    return { error: "Bookings can only be made up to 7 days in advance. Please select a date within this week." };
  }

  const facility = await prisma.facility.findFirstOrThrow({
    where: { id: validated.facilityId, isActive: true }});

  const missingTerms = getMissingFacilityTerms(facility, validated.acceptedTerms ?? []);
  if (missingTerms.includes("BOOKING_TERMS")) {
    return { error: "You must agree to Booking Terms and Conditions before creating this booking." };
  }
  if (missingTerms.includes("ITEM_BOOKING_TERMS")) {
    return { error: "You must agree to Item Booking Terms before creating this booking." };
  }

  if (facility.underMaintenance) {
    return { error: "Facility is under maintenance and cannot be booked." };
  }

  const maintConflict = await getFacilityMaintenanceConflict(
    validated.facilityId,
    validated.startTime,
    validated.endTime,
  );
  if (maintConflict) {
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return {
      error: `This facility is scheduled for maintenance from ${fmt(maintConflict.scheduledStart!)} to ${fmt(maintConflict.scheduledEnd!)}. Please choose dates outside this window.`,
    };
  }

  // Find or create a Patron for the guest so booking is payable
  let patron = await prisma.patron.findFirst({
    where: {
      OR: [
        { email: validated.guestEmail },
        ...(validated.guestPhone ? [{ phone: validated.guestPhone }] : []),
      ],
    },
  });
  if (!patron) {
    const cryptoModule = await import("crypto");
    const tempHash = cryptoModule.randomBytes(32).toString("hex");
    patron = await prisma.patron.create({
      data: {
        email: validated.guestEmail,
        name:  validated.guestName,
        phone: validated.guestPhone,
        passwordHash: tempHash,
        isVerified: false,
      },
    });
  }

  const guestMeta = `Guest: ${validated.guestName} | ${validated.guestEmail}${validated.guestPhone ? ` | ${validated.guestPhone}` : ""}`;

  type TxResult =
    | { booking: Awaited<ReturnType<typeof prisma.booking.create>> & { facility: { name: string } | null } }
    | { error: string };

  const txResult: TxResult = await prisma.$transaction(async (tx): Promise<TxResult> => {
    await acquireFacilityLock(tx, validated.facilityId);

    const amountResult = await computeConfiguredBookingAmount(
      tx,
      validated.facilityId,
      validated.category,
      validated.startTime,
      validated.endTime,
      validated.useAirConditioner,
    );
    if ("error" in amountResult) return { error: amountResult.error! };

    const slot = await findApplicableTimeSlot(tx, validated.facilityId, validated.category, validated.startTime, validated.endTime);
    const maxAllowed = slot?.maxBookings ?? 1;
    const overlapCount = await countOverlappingBookings(tx, validated.facilityId, validated.startTime, validated.endTime);
    if (overlapCount >= maxAllowed) {
      return { error: overlapCount >= 1 ? "This time slot is fully booked." : "Facility already has a booking for that time slot." };
    }

    const booking = await tx.booking.create({
      data: {
        facilityId:   validated.facilityId,
        patronId:     patron!.id,
        category:     validated.category,
        title:        validated.title,
        description:  validated.description,
        startTime:    validated.startTime,
        endTime:      validated.endTime,
        acRequested:  validated.useAirConditioner,
        notes:        [validated.notes, guestMeta].filter(Boolean).join("\n") || null,
        totalAmount:  amountResult.totalAmount,
        resolvedUnitPrice: amountResult.unitPrice,
        resolvedPricingSource: amountResult.pricingSource,
        status: "PENDING",
      },
      include: { facility: true },
    });
    return { booking };
  });

  if ("error" in txResult) return { error: txResult.error };
  const { booking } = txResult;

  await notifyBookingConfirmation({
    phone:        validated.guestPhone,
    bookingTitle: booking.title,
    startTime:    booking.startTime,
    facilityName: booking.facility?.name ?? "N/A",
    accountClaimUrl: `${process.env.NEXT_PUBLIC_APP_URL}/patron/register`,
  });
  await sendBookingConfirmationEmail({
    to: validated.guestEmail,
    name: validated.guestName,
    bookingTitle: booking.title,
    facilityName: booking.facility?.name ?? "N/A",
    startTime: booking.startTime,
    endTime: booking.endTime,
    totalAmount: Number(booking.totalAmount),
    accountClaimUrl: `${process.env.NEXT_PUBLIC_APP_URL}/patron/register`,
  });

  // Alert all FMs about the new pending guest booking
  const guestFMs = await prisma.user.findMany({
    where: { role: "FACILITY_MANAGER", isActive: true },
    select: { phone: true },
  });
  for (const fm of guestFMs) {
    if (fm.phone) {
      await notifyFMBookingPending({
        phone:        fm.phone,
        bookedBy:     validated.guestName,
        bookingTitle: booking.title,
        facilityName: booking.facility?.name ?? "N/A",
        startTime:    booking.startTime,
      });
    }
  }

  auditLog({
    action: "CREATE_GUEST_BOOKING",
    entity: "Booking",
    entityId: booking.id,
    after: { guestName: validated.guestName, guestEmail: validated.guestEmail }});

  revalidatePath("/guest/book");
  return { success: true, booking };
}

// ── Approve / Reject ──────────────────────────────────────────────────────────

export async function approveBooking(bookingId: string, waiveBilling = false) {
  const session  = await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  await prisma.booking.findFirstOrThrow({ where: { id: bookingId, deletedAt: null } });

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "APPROVED",
      ...(waiveBilling ? { isBillingWaived: true, totalAmount: 0 } : {}),
    },
    include: { patron: true, user: true, facility: true }});

  const contact = booking.patron ?? booking.user;

  if (contact?.phone) {
    await notifyBookingApproved({
      phone:        contact.phone,
      bookingTitle: booking.title,
      startTime:    booking.startTime,
    });
  }
  if (contact?.email) {
    await sendBookingApprovedEmail({
      to:           contact.email,
      name:         contact.name,
      bookingTitle: booking.title,
      facilityName: booking.facility?.name ?? "N/A",
      startTime:    booking.startTime,
      totalAmount:  Number(booking.totalAmount),
    });
  }

  auditLog({ userId: session.sub, action: "APPROVE_BOOKING", entity: "Booking", entityId: bookingId });
  revalidatePath("/bookings");
  return { success: true, booking };
}

export async function rejectBooking(bookingId: string, reason: string) {
  const session = await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  await prisma.booking.findFirstOrThrow({ where: { id: bookingId, deletedAt: null } });

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "REJECTED", rejectionReason: reason },
    include: { patron: true, user: true },
  });

  const contact = booking.patron ?? booking.user;
  if (contact?.phone) {
    await notifyBookingRejected({
      phone:        contact.phone,
      bookingTitle: booking.title,
      reason,
    });
  }
  if (contact?.email) {
    await sendBookingRejectedEmail({
      to:           contact.email,
      name:         contact.name,
      bookingTitle: booking.title,
      reason,
    });
  }

  auditLog({ userId: session.sub, action: "REJECT_BOOKING", entity: "Booking", entityId: bookingId, after: { reason } });
  revalidatePath("/bookings");
  return { success: true, booking };
}

export async function cancelBooking(bookingId: string) {
  const session = await getSession();
  if (!session) return { error: "Unauthorized" };

  const booking = await prisma.booking.findFirstOrThrow({
    where: { id: bookingId, deletedAt: null },
  });

  if (session.role === "PATRON" && booking.patronId !== session.sub) {
    return { error: "Unauthorized" };
  }
  if (booking.status === "COMPLETED") return { error: "Cannot cancel a completed booking." };

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  auditLog({ userId: session.sub, action: "CANCEL_BOOKING", entity: "Booking", entityId: bookingId });
  revalidatePath("/bookings");
  return { success: true };
}

export async function completeBooking(bookingId: string) {
  const session = await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");

  const booking = await prisma.booking.findFirstOrThrow({ where: { id: bookingId, deletedAt: null } });
  if (booking.status !== "APPROVED") return { error: "Only approved bookings can be marked as completed." };

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED" },
  });

  auditLog({ userId: session.sub, action: "COMPLETE_BOOKING", entity: "Booking", entityId: bookingId });
  revalidatePath("/bookings");
  return { success: true };
}

// ── Manager Update ────────────────────────────────────────────────────────────

const ManagerBookingUpdateSchema = BookingSchema;

export async function updateBookingByManager(bookingId: string, data: z.input<typeof ManagerBookingUpdateSchema>) {
  const session = await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");
  const validated = ManagerBookingUpdateSchema.parse(data);

  const existing = await prisma.booking.findFirstOrThrow({ where: { id: bookingId, deletedAt: null } });

  if (existing.status === "COMPLETED") {
    return { error: "Completed bookings cannot be edited." };
  }

  const facility = await prisma.facility.findFirstOrThrow({
    where: { id: validated.facilityId, isActive: true },
  });

  // Re-validate terms whenever the facility may have changed
  const missingTerms = getMissingFacilityTerms(facility, validated.acceptedTerms ?? []);
  if (missingTerms.includes("BOOKING_TERMS")) {
    return { error: "You must agree to Booking Terms and Conditions before updating this booking." };
  }
  if (missingTerms.includes("ITEM_BOOKING_TERMS")) {
    return { error: "You must agree to Item Booking Terms before updating this booking." };
  }

  if (facility.underMaintenance) {
    return { error: "This facility is currently under emergency maintenance and cannot be booked." };
  }

  const maintConflict = await getFacilityMaintenanceConflict(
    validated.facilityId,
    validated.startTime,
    validated.endTime,
  );
  if (maintConflict) {
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return {
      error: `This facility is scheduled for maintenance from ${fmt(maintConflict.scheduledStart!)} to ${fmt(maintConflict.scheduledEnd!)}. Please choose dates outside this window.`,
    };
  }

  // Wrap conflict check + price computation + update in a transaction with advisory lock
  type TxResult =
    | { booking: Awaited<ReturnType<typeof prisma.booking.update>> & { facility: { name: string } | null } }
    | { error: string };

  const txResult: TxResult = await prisma.$transaction(async (tx): Promise<TxResult> => {
    await acquireFacilityLock(tx, validated.facilityId);

    // Check capacity respecting maxBookings
    const slot = await findApplicableTimeSlot(tx, validated.facilityId, validated.category, validated.startTime, validated.endTime);
    const maxAllowed = slot?.maxBookings ?? 1;
    const overlapCount = await countOverlappingBookings(tx, validated.facilityId, validated.startTime, validated.endTime, bookingId);
    if (overlapCount >= maxAllowed) {
      return { error: "Facility already has a booking for that time slot." };
    }

    // Recompute price inside the lock
    const amountResult = await computeConfiguredBookingAmount(
      tx,
      validated.facilityId,
      validated.category,
      validated.startTime,
      validated.endTime,
      validated.useAirConditioner,
    );
    if ("error" in amountResult) return { error: amountResult.error! };

    const booking = await tx.booking.update({
      where: { id: bookingId },
      data: {
        facilityId:   validated.facilityId,
        category:     validated.category,
        title:        validated.title,
        description:  validated.description,
        startTime:    validated.startTime,
        endTime:      validated.endTime,
        acRequested:  validated.useAirConditioner,
        notes:        validated.notes ?? null,
        totalAmount:  amountResult.totalAmount,
        resolvedUnitPrice: amountResult.unitPrice,
        resolvedPricingSource: amountResult.pricingSource,
        updatedAt:    new Date(),
      },
      include: {
        facility: { select: { name: true } },
      },
    });
    return { booking };
  });

  if ("error" in txResult) return { error: txResult.error };
  const { booking } = txResult;

  auditLog({ userId: session.sub, action: "UPDATE_BOOKING", entity: "Booking", entityId: bookingId, before: existing, after: booking });
  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true, booking };
}

export async function deleteBookingByManager(bookingId: string) {
  const session = await requireStaff("FACILITY_MANAGER", "BOOKING_MANAGER");

  const booking = await prisma.booking.findFirstOrThrow({
    where: { id: bookingId, deletedAt: null },
    include: {
      income: { select: { id: true } },
    },
  });

  if (booking.income) {
    return { error: "Cannot delete bookings with income records. Cancel the booking instead." };
  }

  if (booking.status === "APPROVED" || booking.status === "COMPLETED") {
    return { error: "Approved or completed bookings cannot be deleted. Cancel instead." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", deletedAt: new Date() },
  });

  auditLog({ userId: session.sub, action: "DELETE_BOOKING", entity: "Booking", entityId: bookingId });
  revalidatePath("/bookings");
  return { success: true };
}

export async function getBookings(filters: {
  status?: string;
  facilityId?: string;
  from?: Date;
  to?: Date;
  page?: number;
} = {}) {
  const session  = await getSession();
  if (!session) return { bookings: [], total: 0 };  const page = filters.page ?? 1;
  const take = 20;

  const where: Record<string, unknown> = { deletedAt: null };
  if (filters.status)     where.status = filters.status;
  if (filters.facilityId) where.facilityId = filters.facilityId;
  if (session.role === "PATRON") where.patronId = session.sub;

  if (filters.from || filters.to) {
    where.startTime = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to   ? { lte: filters.to }   : {})};
  }

  const [bookings, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      include: { facility: { select: { name: true } }, patron: { select: { name: true } }, user: { select: { name: true } } },
      orderBy: { startTime: "asc" },
      skip: (page - 1) * take,
      take}),
    prisma.booking.count({ where }),
  ]);

  return { bookings, total, page, pages: Math.ceil(total / take) };
}
