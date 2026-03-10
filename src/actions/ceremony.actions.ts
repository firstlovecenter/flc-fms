"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requirePermission } from "@/lib/auth/guards";
import { auditLog } from "@/lib/audit";
import { BookingCategory } from "@prisma/client";

// ── Schemas ───────────────────────────────────────────────────────────────────

const CeremonyDaySchema = z.object({
  facilityId: z.string().min(1),
  date: z.coerce.date(),
  title: z.string().min(2).max(200).optional(),
  notes: z.string().optional(),
});

const CeremonyTimeSlotSchema = z.object({
  ceremonyDayId: z.string().min(1),
  category: z.nativeEnum(BookingCategory),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Must be HH:MM"),
  label: z.string().min(2).max(200),
  maxBookings: z.coerce.number().int().min(1).default(1),
  pricePerHour: z.coerce.number().min(0).optional(),
  isFree: z.coerce.boolean().default(false),
}).refine((d) => d.endTime > d.startTime, {
  message: "End time must be after start time",
  path: ["endTime"],
});

// ── Categories that are considered ceremonies ────────────────────────────────

export const CEREMONY_CATEGORIES: BookingCategory[] = [
  "WEDDING",
  "FUNERAL",
  "BABY_DEDICATION",
];

// ── CRUD: Ceremony Days ──────────────────────────────────────────────────────

export async function createCeremonyDay(data: z.infer<typeof CeremonyDaySchema>) {
  const session = await requirePermission("canManageFacilities");
  const validated = CeremonyDaySchema.parse(data);

  // Ensure date is at start of day
  const dateOnly = new Date(validated.date);
  dateOnly.setHours(0, 0, 0, 0);

  // Check Monday restriction
  if (dateOnly.getDay() === 1) {
    return { error: "Cannot create ceremony days on Mondays. The office is closed." };
  }

  const existing = await prisma.ceremonyDay.findFirst({
    where: { facilityId: validated.facilityId, date: dateOnly },
  });
  if (existing) return { error: "A ceremony day already exists for this date and facility." };

  const day = await prisma.ceremonyDay.create({
    data: {
      facilityId: validated.facilityId,
      date: dateOnly,
      title: validated.title,
      notes: validated.notes,
      createdById: session.sub,
    },
  });

  auditLog({
    userId: session.sub,
    action: "CREATE_CEREMONY_DAY",
    entity: "CeremonyDay",
    entityId: day.id,
    after: day,
  });
  revalidatePath(`/facilities/${validated.facilityId}/ceremonies`);
  return { success: true, day };
}

export async function deleteCeremonyDay(id: string) {
  const session = await requirePermission("canManageFacilities");

  const day = await prisma.ceremonyDay.delete({ where: { id } });

  auditLog({
    userId: session.sub,
    action: "DELETE_CEREMONY_DAY",
    entity: "CeremonyDay",
    entityId: id,
  });
  revalidatePath(`/facilities/${day.facilityId}/ceremonies`);
  return { success: true };
}

export async function getCeremonyDays(facilityId: string) {
  const days = await prisma.ceremonyDay.findMany({
    where: { facilityId, isActive: true },
    include: {
      timeSlots: {
        where: { isActive: true },
        orderBy: { startTime: "asc" },
      },
      createdBy: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });
  return days;
}

// ── CRUD: Ceremony Time Slots ────────────────────────────────────────────────

export async function addCeremonyTimeSlot(data: z.infer<typeof CeremonyTimeSlotSchema>) {
  const session = await requirePermission("canManageFacilities");
  const validated = CeremonyTimeSlotSchema.parse(data);

  const slot = await prisma.ceremonyTimeSlot.create({
    data: {
      ceremonyDayId: validated.ceremonyDayId,
      category: validated.category,
      startTime: validated.startTime,
      endTime: validated.endTime,
      label: validated.label,
      maxBookings: validated.maxBookings,
      pricePerHour: validated.pricePerHour,
      isFree: validated.isFree,
    },
    include: { ceremonyDay: true },
  });

  auditLog({
    userId: session.sub,
    action: "ADD_CEREMONY_TIME_SLOT",
    entity: "CeremonyTimeSlot",
    entityId: slot.id,
    after: slot,
  });
  revalidatePath(`/facilities/${slot.ceremonyDay.facilityId}/ceremonies`);
  return { success: true, slot };
}

export async function deleteCeremonyTimeSlot(id: string) {
  const session = await requirePermission("canManageFacilities");

  const slot = await prisma.ceremonyTimeSlot.delete({
    where: { id },
    include: { ceremonyDay: true },
  });

  auditLog({
    userId: session.sub,
    action: "DELETE_CEREMONY_TIME_SLOT",
    entity: "CeremonyTimeSlot",
    entityId: id,
  });
  revalidatePath(`/facilities/${slot.ceremonyDay.facilityId}/ceremonies`);
  return { success: true };
}

// ── Availability: Get ceremony dates for a facility + category ───────────────

export async function getCeremonyDatesForCategory(
  facilityId: string,
  category: BookingCategory,
) {
  const days = await prisma.ceremonyDay.findMany({
    where: {
      facilityId,
      isActive: true,
      date: { gte: new Date() },
      timeSlots: {
        some: { category, isActive: true },
      },
    },
    select: { id: true, date: true, title: true },
    orderBy: { date: "asc" },
  });
  return days;
}

// ── Availability: Get ceremony slots for a specific date + category ──────────

export async function getCeremonySlots(
  facilityId: string,
  date: Date,
  category: BookingCategory,
) {
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  const day = await prisma.ceremonyDay.findFirst({
    where: { facilityId, date: dateOnly, isActive: true },
    include: {
      timeSlots: {
        where: { category, isActive: true },
        orderBy: { startTime: "asc" },
      },
    },
  });

  if (!day) return { slots: [] };

  // Check existing bookings for each slot
  const startOfDay = new Date(dateOnly);
  const endOfDay = new Date(dateOnly);
  endOfDay.setHours(23, 59, 59, 999);

  const existingBookings = await prisma.booking.findMany({
    where: {
      facilityId,
      status: { in: ["PENDING", "APPROVED"] },
      startTime: { gte: startOfDay, lte: endOfDay },
    },
    select: { startTime: true, endTime: true },
  });

  function parseTime(t: string) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }

  const slots = day.timeSlots.map((slot) => {
    const slotStart = parseTime(slot.startTime);
    const slotEnd = parseTime(slot.endTime);

    const overlapping = existingBookings.filter((b) => {
      const bStart = b.startTime.getHours() * 60 + b.startTime.getMinutes();
      const bEnd = b.endTime.getHours() * 60 + b.endTime.getMinutes();
      return (
        (bStart >= slotStart && bStart < slotEnd) ||
        (bEnd > slotStart && bEnd <= slotEnd) ||
        (bStart <= slotStart && bEnd >= slotEnd)
      );
    });

    return {
      id: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      label: slot.label,
      isFree: slot.isFree,
      effectivePricePerHour: slot.isFree ? 0 : Number(slot.pricePerHour ?? 0),
      maxBookings: slot.maxBookings,
      currentBookings: overlapping.length,
      isAvailable: overlapping.length < slot.maxBookings,
    };
  });

  return { slots, ceremonyDayTitle: day.title };
}
