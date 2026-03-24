"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireStaff, requirePatron } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/redis";
import { headers } from "next/headers";
import { sendPushToAllStaff } from "@/lib/notifications/push";
import { verifyCheckInProximity } from "@/lib/geolocation";

// ─── Patron: Request Check-In ──────────────────────────────────────────────

export async function requestCheckIn(bookingId: string, coords?: { latitude: number; longitude: number }) {
  const session = await requirePatron();

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      patronId: session.sub,
      status: "APPROVED",
      deletedAt: null,
    },
    include: { checkIn: true, facility: { select: { latitude: true, longitude: true, name: true } } },
  });

  if (!booking) return { error: "Booking not found or not approved." };
  if (booking.checkIn) return { error: "Already checked in." };
  if (booking.checkInRequested) return { error: "Check-in already requested." };

  // Only allow check-in requests on the day of the booking (±1 hour buffer)
  const now = new Date();
  const bookingDate = new Date(booking.startTime);
  const bufferMs = 60 * 60 * 1000; // 1 hour
  const dayStart = new Date(bookingDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(bookingDate);
  dayEnd.setHours(23, 59, 59, 999);

  if (now < new Date(dayStart.getTime() - bufferMs) || now > dayEnd) {
    return { error: "Check-in can only be requested on the day of your booking." };
  }

  // Verify geolocation proximity if coordinates provided and facility has GPS
  if (coords && booking.facility) {
    const proximity = verifyCheckInProximity(
      coords.latitude,
      coords.longitude,
      booking.facility.latitude,
      booking.facility.longitude
    );
    if (!proximity.allowed) {
      return { error: `You appear to be ${proximity.distance}m from the facility. Please move closer to check in (max ${500}m).` };
    }
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      checkInRequested: true,
      checkInRequestedAt: now,
    },
  });

  // Notify staff about check-in request
  sendPushToAllStaff({
    title: "Check-In Request",
    body: `${session.name} requests check-in for "${booking.title}" at ${booking.facility?.name ?? "N/A"}`,
    url: "/checkin",
    tag: `checkin-request-${bookingId}`,
  });

  auditLog({
    userId: session.sub,
    action: "REQUEST_CHECKIN",
    entity: "Booking",
    entityId: bookingId,
  });

  revalidatePath("/patron/bookings");
  revalidatePath("/checkin");
  return { success: true };
}

// ─── Staff: Get Check-In Queue ──────────────────────────────────────────────

export async function getCheckInQueue() {
  await requireStaff();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "APPROVED",
      deletedAt: null,
      startTime: { lte: todayEnd },
      endTime: { gte: todayStart },
    },
    include: {
      facility: { select: { id: true, name: true } },
      patron: { select: { id: true, name: true, phone: true, email: true } },
      user: { select: { id: true, name: true, phone: true, email: true } },
      checkIn: {
        include: {
          checkedInBy: { select: { name: true } },
          checkedOutBy: { select: { name: true } },
        },
      },
    },
    orderBy: [
      { checkInRequested: "desc" },
      { startTime: "asc" },
    ],
  });

  return bookings;
}

// ─── Staff: Get Inventory Requirements for a Facility ───────────────────────

export async function getInventoryRequirements(facilityId: string) {
  await requireStaff();

  const requirements = await prisma.facilityInventoryRequirement.findMany({
    where: { facilityId },
    include: {
      item: {
        select: {
          id: true,
          name: true,
          status: true,
          quantity: true,
          condition: true,
        },
      },
    },
    orderBy: { isRequired: "desc" },
  });

  return requirements;
}

// ─── Staff: Perform Check-In ────────────────────────────────────────────────

const CheckInSchema = z.object({
  bookingId: z.string().min(1),
  notes: z.string().optional(),
});

export async function performCheckIn(data: z.infer<typeof CheckInSchema>) {
  const session = await requireStaff();
  const parsed = CheckInSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { bookingId, notes } = parsed.data;

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      status: "APPROVED",
      deletedAt: null,
    },
    include: {
      checkIn: true,
      facility: {
        include: {
          inventoryRequirements: {
            where: { isRequired: true },
            include: { item: { select: { id: true, name: true, status: true, quantity: true } } },
          },
        },
      },
    },
  });

  if (!booking) return { error: "Booking not found or not approved." };
  if (booking.checkIn) return { error: "Booking is already checked in." };

  // Check required inventory items availability
  const unavailable: string[] = [];
  if (booking.facility?.inventoryRequirements) {
    for (const req of booking.facility.inventoryRequirements) {
      if (req.item.status !== "AVAILABLE" || req.item.quantity < req.quantity) {
        unavailable.push(`${req.item.name} (need ${req.quantity}, ${req.item.status === "AVAILABLE" ? `only ${req.item.quantity} available` : req.item.status})`);
      }
    }
  }

  if (unavailable.length > 0) {
    return {
      error: "Required inventory items are not available.",
      unavailableItems: unavailable,
    };
  }

  await prisma.facilityCheckIn.create({
    data: {
      bookingId,
      checkedInById: session.sub,
      notes: notes || null,
    },
  });

  auditLog({
    userId: session.sub,
    action: "CHECKIN_BOOKING",
    entity: "FacilityCheckIn",
    entityId: bookingId,
    after: { notes },
  });

  revalidatePath("/checkin");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

// ─── Staff: Perform Check-Out ───────────────────────────────────────────────

const CheckOutSchema = z.object({
  bookingId: z.string().min(1),
  notes: z.string().optional(),
});

export async function performCheckOut(data: z.infer<typeof CheckOutSchema>) {
  const session = await requireStaff();
  const parsed = CheckOutSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { bookingId, notes } = parsed.data;

  const checkIn = await prisma.facilityCheckIn.findUnique({
    where: { bookingId },
  });

  if (!checkIn) return { error: "No check-in record found for this booking." };
  if (checkIn.checkedOutAt) return { error: "Already checked out." };

  await prisma.facilityCheckIn.update({
    where: { bookingId },
    data: {
      checkedOutById: session.sub,
      checkedOutAt: new Date(),
      notes: notes
        ? checkIn.notes
          ? `${checkIn.notes}\n---\nCheck-out: ${notes}`
          : `Check-out: ${notes}`
        : undefined,
    },
  });

  auditLog({
    userId: session.sub,
    action: "CHECKOUT_BOOKING",
    entity: "FacilityCheckIn",
    entityId: bookingId,
    after: { notes },
  });

  revalidatePath("/checkin");
  revalidatePath(`/bookings/${bookingId}`);
  return { success: true };
}

// ─── Guest: Lookup Today's Bookings by Phone ────────────────────────────────

const GuestLookupSchema = z.object({
  phone: z.string().min(9).max(20),
});

export async function lookupGuestCheckInBookings(data: z.infer<typeof GuestLookupSchema>) {
  const { phone } = GuestLookupSchema.parse(data);

  const ip = headers().get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { allowed } = await rateLimit(`guest_checkin_lookup:${ip}`, 10, 300);
  if (!allowed) return { error: "Too many attempts. Please try again later." };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // Strip all non-digit characters for a reliable partial match
  const digits = phone.replace(/\D/g, "");
  // Use the last 9 digits (local number without country code) for matching
  const searchDigits = digits.length > 9 ? digits.slice(-9) : digits;

  const bookings = await prisma.booking.findMany({
    where: {
      status: "APPROVED",
      deletedAt: null,
      startTime: { lte: todayEnd },
      endTime: { gte: todayStart },
      OR: [
        { patron: { phone: { contains: searchDigits } } },
        { user:   { phone: { contains: searchDigits } } },
      ],
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      checkInRequested: true,
      facility: { select: { name: true } },
      checkIn: { select: { id: true } },
    },
    orderBy: { startTime: "asc" },
  });

  return {
    bookings: bookings.map((b) => ({
      id: b.id,
      title: b.title,
      facilityName: b.facility?.name ?? "N/A",
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      checkInRequested: b.checkInRequested,
      alreadyCheckedIn: !!b.checkIn,
    })),
  };
}

// ─── Guest: Request Check-In (no auth, rate-limited) ────────────────────────

const GuestCheckInRequestSchema = z.object({
  bookingId: z.string().min(1),
  phone: z.string().min(9).max(20),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export async function requestGuestCheckIn(data: z.infer<typeof GuestCheckInRequestSchema>) {
  const parsed = GuestCheckInRequestSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid request." };

  const { bookingId, phone, latitude, longitude } = parsed.data;

  const ip = headers().get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { allowed } = await rateLimit(`guest_checkin_req:${ip}`, 10, 300);
  if (!allowed) return { error: "Too many attempts. Please try again later." };

  // Verify the booking belongs to a patron with this phone
  const phoneDigits = phone.replace(/\D/g, "");
  const searchDigits = phoneDigits.length > 9 ? phoneDigits.slice(-9) : phoneDigits;

  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      status: "APPROVED",
      deletedAt: null,
      OR: [
        { patron: { phone: { contains: searchDigits } } },
        { user:   { phone: { contains: searchDigits } } },
      ],
    },
    include: { checkIn: true, facility: { select: { latitude: true, longitude: true } } },
  });

  if (!booking) return { error: "Booking not found." };
  if (booking.checkIn) return { error: "Already checked in." };
  if (booking.checkInRequested) return { error: "Check-in already requested." };

  // Verify geolocation proximity if coordinates provided
  if (latitude != null && longitude != null && booking.facility) {
    const proximity = verifyCheckInProximity(
      latitude,
      longitude,
      booking.facility.latitude,
      booking.facility.longitude
    );
    if (!proximity.allowed) {
      return { error: `You appear to be ${proximity.distance}m from the facility. Please move closer to check in (max ${500}m).` };
    }
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      checkInRequested: true,
      checkInRequestedAt: new Date(),
    },
  });

  auditLog({
    action: "GUEST_REQUEST_CHECKIN",
    entity: "Booking",
    entityId: bookingId,
  });

  revalidatePath("/checkin");
  return { success: true };
}
