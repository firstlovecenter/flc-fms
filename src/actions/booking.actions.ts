"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { requireStaff, requirePermission, requirePatron } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { sendBookingConfirmationEmail, sendBookingApprovedEmail, sendBookingRejectedEmail } from "@/lib/notifications/email";
import { notifyBookingApproved, notifyBookingRejected, notifyBookingConfirmation } from "@/lib/notifications/sms";
import { BookingCategory } from "@prisma/client";
import { getFacilityMaintenanceConflict } from "./maintenance.actions";

const BookingSchema = z.object({
  facilityId:  z.string().min(1, "Facility is required"),
  category:    z.nativeEnum(BookingCategory),
  title:       z.string().min(2).max(200),
  description: z.string().optional(),
  startTime:   z.coerce.date(),
  endTime:     z.coerce.date(),
  notes:       z.string().optional(),
}).refine(d => d.endTime > d.startTime, {
  message: "End time must be after start time",
  path: ["endTime"],
});

async function checkConflict(facilityId: string, startTime: Date, endTime: Date, excludeId?: string) {
  return prisma.booking.findFirst({
    where: {
      facilityId,
      status: { in: ["PENDING", "APPROVED"] },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
      AND: [
        { startTime: { lt: endTime } },
        { endTime:   { gt: startTime } },
      ]}});
}

function toTimeString(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

async function findApplicableTimeSlot(
  facilityId: string,
  category: BookingCategory,
  startTime: Date,
  endTime: Date,
) {
  const dayOfWeek = startTime.getDay();
  const start = toTimeString(startTime);
  const end = toTimeString(endTime);

  const categorySlot = await prisma.facilityTimeSlot.findFirst({
    where: {
      facilityId,
      dayOfWeek,
      category,
      isActive: true,
      startTime: { lte: start },
      endTime: { gte: end },
    },
    orderBy: { startTime: "asc" },
  });

  if (categorySlot) return categorySlot;

  return prisma.facilityTimeSlot.findFirst({
    where: {
      facilityId,
      dayOfWeek,
      category: null,
      isActive: true,
      startTime: { lte: start },
      endTime: { gte: end },
    },
    orderBy: { startTime: "asc" },
  });
}

async function computeConfiguredBookingAmount(
  facilityId: string,
  category: BookingCategory,
  startTime: Date,
  endTime: Date,
) {
  const pricing = await prisma.facilityPricing.findFirst({
    where: {
      facilityId,
      category,
      isActive: true,
    },
  });

  if (!pricing) return { error: "No pricing configured for this booking category." as const };

  const slot = await findApplicableTimeSlot(facilityId, category, startTime, endTime);
  if (slot?.isFree) return { totalAmount: 0 };

  const hours = (endTime.getTime() - startTime.getTime()) / 3_600_000;
  const unitPrice =
    slot?.pricePerHourOverride != null
      ? Number(slot.pricePerHourOverride)
      : Number(pricing.pricePerHour);
  const totalAmount = pricing.freeDays.includes(startTime.getDay()) ? 0 : unitPrice * hours;

  return { totalAmount };
}

// ── Create booking (staff) ────────────────────────────────────────────────────

export async function createStaffBooking(data: z.infer<typeof BookingSchema>) {
  const session  = await requirePermission("canCreateBookings");
  const validated = BookingSchema.parse(data);

  // Mondays are office off-days (Sabbath) — no bookings allowed
  if (validated.startTime.getDay() === 1) {
    return { error: "Bookings cannot be made on Mondays. The office is closed on Mondays (Sabbath day)." };
  }

  const facility = await prisma.facility.findFirstOrThrow({
    where: { id: validated.facilityId, isActive: true },
  });

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

  const conflict = await checkConflict(validated.facilityId, validated.startTime, validated.endTime);
  if (conflict) return { error: "Facility already has a booking for that time slot." };

  const amountResult = await computeConfiguredBookingAmount(
    validated.facilityId,
    validated.category,
    validated.startTime,
    validated.endTime,
  );
  if ("error" in amountResult) return { error: amountResult.error };
  const totalAmount = amountResult.totalAmount;

  const booking = await prisma.booking.create({
    data: {
      facilityId:  validated.facilityId,
      userId:      session.sub,
      category:    validated.category,
      title:       validated.title,
      description: validated.description,
      startTime:   validated.startTime,
      endTime:     validated.endTime,
      notes:       validated.notes,
      totalAmount,
      status:       session.role === "FACILITY_MANAGER" ? "APPROVED" : "PENDING",
      paymentStatus: "UNPAID",
    },
    include: { facility: true, user: true },
  });

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

  auditLog({ userId: session.sub, action: "CREATE_BOOKING", entity: "Booking", entityId: booking.id, after: booking });
  revalidatePath("/bookings");
  return { success: true, booking };
}

// ── Create booking (patron) ───────────────────────────────────────────────────

export async function createPatronBooking(data: z.infer<typeof BookingSchema>) {
  const session  = await requirePatron();
  const validated = BookingSchema.parse(data);

  // Mondays are office off-days (Sabbath) — no bookings allowed
  if (validated.startTime.getDay() === 1) {
    return { error: "Bookings cannot be made on Mondays. The office is closed on Mondays (Sabbath day)." };
  }

  const facility = await prisma.facility.findFirstOrThrow({
    where: { id: validated.facilityId, isActive: true },
  });

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

  const conflict = await checkConflict(validated.facilityId, validated.startTime, validated.endTime);
  if (conflict) return { error: "Facility already has a booking for that time slot." };

  const amountResult = await computeConfiguredBookingAmount(
    validated.facilityId,
    validated.category,
    validated.startTime,
    validated.endTime,
  );
  if ("error" in amountResult) return { error: amountResult.error };
  const totalAmount = amountResult.totalAmount;

  const booking = await prisma.booking.create({
    data: {
      facilityId:  validated.facilityId,
      patronId:    session.sub,
      category:    validated.category,
      title:       validated.title,
      description: validated.description,
      startTime:   validated.startTime,
      endTime:     validated.endTime,
      notes:       validated.notes,
      totalAmount,
      status:       "PENDING",
      paymentStatus: "UNPAID",
    },
    include: { facility: true, patron: true },
  });

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
      totalAmount:   Number(booking.totalAmount)});
  }

  auditLog({ userId: session.sub, action: "CREATE_PATRON_BOOKING", entity: "Booking", entityId: booking.id });
  revalidatePath("/bookings");
  return { success: true, booking };
}

const GuestBookingSchema = z.object({
  facilityId: z.string().min(1, "Facility is required"),
  category: z.nativeEnum(BookingCategory),
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  notes: z.string().optional(),
  guestName: z.string().min(2).max(120),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(9, "Phone number is required")}).refine((d) => d.endTime > d.startTime, {
  message: "End time must be after start time",
  path: ["endTime"]});

export async function createGuestBooking(data: z.infer<typeof GuestBookingSchema>) {
  const validated = GuestBookingSchema.parse(data);

  // Mondays are office off-days (Sabbath) — no bookings allowed
  if (validated.startTime.getDay() === 1) {
    return { error: "Bookings cannot be made on Mondays. The office is closed on Mondays (Sabbath day)." };
  }

  const facility = await prisma.facility.findFirstOrThrow({
    where: { id: validated.facilityId, isActive: true }});

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

  const conflict = await checkConflict(validated.facilityId, validated.startTime, validated.endTime);
  if (conflict) return { error: "Facility already has a booking for that time slot." };

  const amountResult = await computeConfiguredBookingAmount(
    validated.facilityId,
    validated.category,
    validated.startTime,
    validated.endTime,
  );
  if ("error" in amountResult) return { error: amountResult.error };
  const totalAmount = amountResult.totalAmount;

  const guestMeta = `Guest: ${validated.guestName} | ${validated.guestEmail}${validated.guestPhone ? ` | ${validated.guestPhone}` : ""}`;

  const booking = await prisma.booking.create({
    data: {
      facilityId: validated.facilityId,
      category: validated.category,
      title: validated.title,
      description: validated.description,
      startTime: validated.startTime,
      endTime: validated.endTime,
      notes: [validated.notes, guestMeta].filter(Boolean).join("\n"),
      totalAmount,
      status: "PENDING",
      paymentStatus: "UNPAID"},
    include: { facility: true }});

  await notifyBookingConfirmation({
    phone:        validated.guestPhone,
    bookingTitle: booking.title,
    startTime:    booking.startTime,
    facilityName: booking.facility?.name ?? "N/A",
  });
  await sendBookingConfirmationEmail({
    to: validated.guestEmail,
    name: validated.guestName,
    bookingTitle: booking.title,
    facilityName: booking.facility?.name ?? "N/A",
    startTime: booking.startTime,
    endTime: booking.endTime,
    totalAmount: Number(booking.totalAmount)});

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
  const session  = await requireStaff("FACILITY_MANAGER");  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "APPROVED",
      ...(waiveBilling ? { isBillingWaived: true, totalAmount: 0, paymentStatus: "PAID" } : {}),
    },
    include: { patron: true, user: true, facility: true }});

  const contact = booking.patron ?? booking.user;
  const paymentUrl = !waiveBilling && Number(booking.totalAmount) > 0
    ? `${process.env.NEXT_PUBLIC_APP_URL}/patron/bookings`
    : undefined;

  if (contact?.phone) {
    await notifyBookingApproved({
      phone:        contact.phone,
      bookingTitle: booking.title,
      startTime:    booking.startTime,
      paymentUrl});
  }
  if (contact?.email) {
    await sendBookingApprovedEmail({
      to:           contact.email,
      name:         contact.name,
      bookingTitle: booking.title,
      facilityName: booking.facility?.name ?? "N/A",
      startTime:    booking.startTime,
      totalAmount:  Number(booking.totalAmount),
      paymentUrl});
  }

  auditLog({ userId: session.sub, action: "APPROVE_BOOKING", entity: "Booking", entityId: bookingId });
  revalidatePath("/bookings");
  return { success: true, booking };
}

export async function rejectBooking(bookingId: string, reason: string) {
  const session  = await requireStaff("FACILITY_MANAGER");  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "REJECTED", rejectionReason: reason },
    include: { patron: true, user: true }});

  const contact = booking.patron ?? booking.user;
  if (contact?.phone) {
    await notifyBookingRejected({
      phone:        contact.phone,
      bookingTitle: booking.title,
      reason});
  }
  if (contact?.email) {
    await sendBookingRejectedEmail({
      to:           contact.email,
      name:         contact.name,
      bookingTitle: booking.title,
      reason});
  }

  auditLog({ userId: session.sub, action: "REJECT_BOOKING", entity: "Booking", entityId: bookingId, after: { reason } });
  revalidatePath("/bookings");
  return { success: true, booking };
}

export async function cancelBooking(bookingId: string) {
  const session  = await getSession();
  if (!session) return { error: "Unauthorized" };  const booking = await prisma.booking.findFirstOrThrow({
    where: { id: bookingId }});

  // Patron can only cancel their own bookings
  if (session.role === "PATRON" && booking.patronId !== session.sub) {
    return { error: "Unauthorized" };
  }
  if (booking.status === "COMPLETED") return { error: "Cannot cancel a completed booking." };

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" }});

  auditLog({ userId: session.sub, action: "CANCEL_BOOKING", entity: "Booking", entityId: bookingId });
  revalidatePath("/bookings");
  return { success: true };
}

// ── Queries ───────────────────────────────────────────────────────────────────

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

  const where: Record<string, unknown> = {};
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
